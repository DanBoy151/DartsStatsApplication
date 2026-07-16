using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace DartsStatsApplication.Server.Exceptions
{
    /// <summary>
    /// Central place for turning uncaught exceptions into a consistent
    /// ProblemDetails response. Replaces the repeated
    /// catch (Exception ex) { return BadRequest(ex.Message); } blocks that used
    /// to live in every controller action.
    ///
    /// ValidationException (thrown by the *ControllerValidator classes for
    /// business-rule failures) maps to 400 with the validator's message.
    /// Anything else is treated as unexpected: it's logged, and the client only
    /// ever sees a generic 500 - never the raw exception details.
    /// </summary>
    public class ApiExceptionHandler : IExceptionHandler
    {
        private readonly ILogger<ApiExceptionHandler> _logger;

        public ApiExceptionHandler(ILogger<ApiExceptionHandler> logger)
        {
            _logger = logger;
        }

        public async ValueTask<bool> TryHandleAsync(
            HttpContext httpContext,
            Exception exception,
            CancellationToken cancellationToken)
        {
            int statusCode;
            ProblemDetails problemDetails;

            if (exception is ValidationException validationException)
            {
                statusCode = StatusCodes.Status400BadRequest;
                problemDetails = new ProblemDetails
                {
                    Status = statusCode,
                    Title = "Validation failed",
                    Detail = validationException.Message
                };
            }
            else
            {
                statusCode = StatusCodes.Status500InternalServerError;

                _logger.LogError(exception, "Unhandled exception processing {Method} {Path}",
                    httpContext.Request.Method, httpContext.Request.Path);

                problemDetails = new ProblemDetails
                {
                    Status = statusCode,
                    Title = "An unexpected error occurred"
                };
            }

            httpContext.Response.StatusCode = statusCode;
            await httpContext.Response.WriteAsJsonAsync(problemDetails, cancellationToken);

            return true;
        }
    }
}
