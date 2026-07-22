# See https://aka.ms/customizecontainer to learn how to customize your debug container and how Visual Studio uses this Dockerfile to build your images for faster debugging.

# This stage is used when running from VS in fast mode (Default for Debug configuration)
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
USER $APP_UID
WORKDIR /app
# Only 8080 is ever actually used (ASPNETCORE_HTTP_PORTS=8080, set via env var
# at deploy time) - the app has no HTTPS listener configured, so there's
# nothing behind 8081. A second EXPOSE here was ambiguous for Render's
# port auto-detection, which defaulted to its own platform default (10000)
# instead, leaving the health check probing a port nothing listens on.
EXPOSE 8080


# This stage is used to build the service project
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src
COPY ["DartsStatsApplication.Server.csproj", "."]
RUN dotnet restore "./DartsStatsApplication.Server.csproj"
COPY . .
WORKDIR "/src/."
RUN dotnet build "DartsStatsApplication.Server.csproj" -c $BUILD_CONFIGURATION -o /app/build /p:UseAppHost=false

# This stage is used to publish the service project to be copied to the final stage
FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "./DartsStatsApplication.Server.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

# This stage is used in production or when running from VS in regular mode (Default when not using the Debug configuration)
FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "DartsStatsApplication.Server.dll"]