namespace DartsStatsApplication.Server.Middleware
{
    /// <summary>
    /// Minimal API key gate for a single-user tool. When ApiSecurity:ApiKey is
    /// unset (the default for local dev), every request passes through
    /// unchanged. Once a key is configured - via user-secrets locally, or an
    /// environment variable / secrets manager once this is actually deployed -
    /// every request except CORS preflight must supply it via the X-Api-Key
    /// header or receive a 401.
    /// </summary>
    public class ApiKeyMiddleware
    {
        private const string ApiKeyHeaderName = "X-Api-Key";

        private readonly RequestDelegate _next;

        public ApiKeyMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context, IConfiguration configuration)
        {
            // Preflight requests don't carry custom headers; let them through so
            // UseCors can still answer them.
            if (HttpMethods.IsOptions(context.Request.Method))
            {
                await _next(context);
                return;
            }

            var configuredKey = configuration["ApiSecurity:ApiKey"];

            if (string.IsNullOrEmpty(configuredKey))
            {
                await _next(context);
                return;
            }

            if (!context.Request.Headers.TryGetValue(ApiKeyHeaderName, out var providedKey) ||
                providedKey != configuredKey)
            {
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                await context.Response.WriteAsync("Missing or invalid API key.");
                return;
            }

            await _next(context);
        }
    }
}
