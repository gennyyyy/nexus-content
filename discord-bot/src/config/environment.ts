import { config as loadEnv } from "dotenv";

loadEnv();

export type AssistantProviderType = "local" | "openai";

export interface EnvironmentConfig {
    discordBotToken: string;
    commandPrefix: string;
    nexusApiBaseUrl: string;
    defaultProjectId?: string;
    assistantProvider: AssistantProviderType;
    openAiApiKey?: string;
    openAiModel: string;
    requestTimeoutMs: number;
    channelBindingFilePath: string;
}

function readRequired(name: string): string {
    const value = process.env[name]?.trim();
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}

function readOptional(name: string, fallback = ""): string {
    const value = process.env[name]?.trim();
    return value ? value : fallback;
}

function readPositiveNumber(name: string, fallback: number): number {
    const raw = readOptional(name, String(fallback));
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeBaseUrl(baseUrl: string): string {
    return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}

function normalizeAssistantProvider(raw: string): AssistantProviderType {
    return raw.toLowerCase() === "openai" ? "openai" : "local";
}

export function loadEnvironmentConfig(): EnvironmentConfig {
    const assistantProvider = normalizeAssistantProvider(readOptional("ASSISTANT_PROVIDER", "local"));
    const openAiApiKey = readOptional("OPENAI_API_KEY");

    const config: EnvironmentConfig = {
        discordBotToken: readRequired("DISCORD_BOT_TOKEN"),
        commandPrefix: readOptional("DISCORD_PREFIX", "!"),
        nexusApiBaseUrl: normalizeBaseUrl(readOptional("NEXUS_API_BASE", "http://localhost:8000/api")),
        defaultProjectId: readOptional("DEFAULT_PROJECT_ID") || undefined,
        assistantProvider,
        openAiApiKey: openAiApiKey || undefined,
        openAiModel: readOptional("OPENAI_MODEL", "gpt-4.1-mini"),
        requestTimeoutMs: readPositiveNumber("NEXUS_REQUEST_TIMEOUT_MS", 15000),
        channelBindingFilePath: readOptional("CHANNEL_BINDING_FILE", "data/channel-project-map.json"),
    };

    if (config.assistantProvider === "openai" && !config.openAiApiKey) {
        console.warn(
            "[config] ASSISTANT_PROVIDER is set to openai but OPENAI_API_KEY is missing. Falling back to local assistant."
        );
        config.assistantProvider = "local";
    }

    return config;
}
