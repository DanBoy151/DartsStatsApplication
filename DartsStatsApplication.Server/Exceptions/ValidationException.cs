namespace DartsStatsApplication.Server.Exceptions
{
    /// <summary>
    /// Thrown by the *ControllerValidator classes when a request violates a
    /// business rule (e.g. completing a leg that hasn't started, or starting a
    /// game with the wrong number of players). ApiExceptionHandler maps this to
    /// a 400 response using the exception's message; any other exception type is
    /// treated as unexpected and maps to 500 without leaking details to the
    /// client.
    /// </summary>
    public class ValidationException : Exception
    {
        public ValidationException(string message) : base(message)
        {
        }
    }
}
