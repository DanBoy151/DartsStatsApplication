using System.Collections.Generic;
using System.Threading.Tasks;
using DartsStatsApplication.Server.Middleware;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace DartsStatsApplication.Server.Tests.Middleware
{
    // Regression coverage for a real deploy-time bug: /healthz was gated by
    // the API key the same as every other route, so once a real
    // ApiSecurity:ApiKey was configured, infrastructure health probes (which
    // have no way to know that key) started getting 401s - the service never
    // passed its host's health check as a result. Caught in production, not
    // by tests, because every earlier test run (including manual container
    // checks) happened to leave the key unset. These tests exercise the
    // middleware directly against both states so that gap can't reopen
    // silently.
    public class ApiKeyMiddlewareTests
    {
        private static IConfiguration ConfigWithKey(string? key)
        {
            var data = new Dictionary<string, string?>();
            if (key is not null)
            {
                data["ApiSecurity:ApiKey"] = key;
            }
            return new ConfigurationBuilder().AddInMemoryCollection(data).Build();
        }

        private static (ApiKeyMiddleware middleware, DefaultHttpContext context, System.Func<bool> nextWasCalled) Build(string path, string method = "GET")
        {
            var nextCalled = false;
            RequestDelegate next = _ =>
            {
                nextCalled = true;
                return Task.CompletedTask;
            };
            var context = new DefaultHttpContext();
            context.Request.Path = path;
            context.Request.Method = method;
            return (new ApiKeyMiddleware(next), context, () => nextCalled);
        }

        [Fact]
        public async Task Healthz_is_reachable_even_when_a_real_key_is_configured()
        {
            var (middleware, context, nextWasCalled) = Build("/healthz");

            await middleware.InvokeAsync(context, ConfigWithKey("real-key"));

            Assert.True(nextWasCalled());
        }

        [Fact]
        public async Task A_normal_route_is_rejected_without_the_key_once_one_is_configured()
        {
            var (middleware, context, nextWasCalled) = Build("/api/Match/matches");

            await middleware.InvokeAsync(context, ConfigWithKey("real-key"));

            Assert.False(nextWasCalled());
            Assert.Equal(StatusCodes.Status401Unauthorized, context.Response.StatusCode);
        }

        [Fact]
        public async Task A_normal_route_passes_with_the_correct_key()
        {
            var (middleware, context, nextWasCalled) = Build("/api/Match/matches");
            context.Request.Headers["X-Api-Key"] = "real-key";

            await middleware.InvokeAsync(context, ConfigWithKey("real-key"));

            Assert.True(nextWasCalled());
        }

        [Fact]
        public async Task A_normal_route_is_rejected_with_the_wrong_key()
        {
            var (middleware, context, nextWasCalled) = Build("/api/Match/matches");
            context.Request.Headers["X-Api-Key"] = "wrong-key";

            await middleware.InvokeAsync(context, ConfigWithKey("real-key"));

            Assert.False(nextWasCalled());
            Assert.Equal(StatusCodes.Status401Unauthorized, context.Response.StatusCode);
        }

        [Fact]
        public async Task Every_route_passes_through_when_no_key_is_configured()
        {
            var (middleware, context, nextWasCalled) = Build("/api/Match/matches");

            await middleware.InvokeAsync(context, ConfigWithKey(null));

            Assert.True(nextWasCalled());
        }

        [Fact]
        public async Task Options_preflight_passes_through_even_with_a_key_configured()
        {
            var (middleware, context, nextWasCalled) = Build("/api/Match/matches", method: "OPTIONS");

            await middleware.InvokeAsync(context, ConfigWithKey("real-key"));

            Assert.True(nextWasCalled());
        }
    }
}
