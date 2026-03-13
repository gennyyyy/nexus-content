import { Client, GatewayIntentBits } from "discord.js";
import { AssistantCoordinator } from "./application/services/AssistantCoordinator.js";
import { ProjectContextService } from "./application/services/ProjectContextService.js";
import { loadEnvironmentConfig } from "./config/environment.js";
import { LocalAssistantProvider } from "./infrastructure/assistant/LocalAssistantProvider.js";
import { OpenAiAssistantProvider } from "./infrastructure/assistant/OpenAiAssistantProvider.js";
import { HttpProjectContextGateway } from "./infrastructure/nexus/HttpProjectContextGateway.js";
import { JsonChannelBindingRepository } from "./infrastructure/persistence/JsonChannelBindingRepository.js";
import { DiscordCommandRouter } from "./presentation/discord/DiscordCommandRouter.js";

const env = loadEnvironmentConfig();

const gateway = new HttpProjectContextGateway(env.nexusApiBaseUrl, env.requestTimeoutMs);
const bindingRepository = new JsonChannelBindingRepository(env.channelBindingFilePath);
const contextService = new ProjectContextService(gateway, bindingRepository, env.defaultProjectId);

const localAssistantProvider = new LocalAssistantProvider();
const assistantProvider =
    env.assistantProvider === "openai" && env.openAiApiKey
        ? new OpenAiAssistantProvider(env.openAiApiKey, env.openAiModel, localAssistantProvider)
        : localAssistantProvider;

const assistantCoordinator = new AssistantCoordinator(contextService, assistantProvider);
const router = new DiscordCommandRouter({
    prefix: env.commandPrefix,
    contextService,
    assistantCoordinator,
});

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

router.register(client);

process.on("unhandledRejection", (reason) => {
    console.error("[process] Unhandled rejection:", reason);
});

process.on("uncaughtException", (error) => {
    console.error("[process] Uncaught exception:", error);
});

void client.login(env.discordBotToken).catch((error) => {
    console.error("[discord] Failed to login:", error);
    process.exit(1);
});
