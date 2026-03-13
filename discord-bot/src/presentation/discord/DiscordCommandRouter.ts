import type { Message } from "discord.js";
import { Events } from "discord.js";
import type { Client } from "discord.js";
import { formatProjectBrief, formatResumePacket } from "../../application/formatters/contextFormatters.js";
import { AssistantCoordinator } from "../../application/services/AssistantCoordinator.js";
import { ProjectContextService } from "../../application/services/ProjectContextService.js";
import { chunkMessage } from "../../utils/text.js";

interface DiscordCommandRouterOptions {
    prefix: string;
    contextService: ProjectContextService;
    assistantCoordinator: AssistantCoordinator;
}

export class DiscordCommandRouter {
    constructor(private readonly options: DiscordCommandRouterOptions) {}

    register(client: Client): void {
        client.on(Events.ClientReady, () => {
            console.log(`[discord] Logged in as ${client.user?.tag ?? "unknown"} | Prefix: ${this.options.prefix}`);
        });

        client.on(Events.MessageCreate, (message) => {
            void this.handleMessage(message);
        });
    }

    private async handleMessage(message: Message): Promise<void> {
        if (message.author.bot || !message.inGuild()) {
            return;
        }

        const content = message.content.trim();
        if (!content.startsWith(this.options.prefix)) {
            return;
        }

        const withoutPrefix = content.slice(this.options.prefix.length).trim();
        if (!withoutPrefix) {
            return;
        }

        const [commandRaw] = withoutPrefix.split(/\s+/, 1);
        const command = commandRaw.toLowerCase();
        const argumentText = withoutPrefix.slice(commandRaw.length).trim();

        try {
            if (command === "help") {
                await this.sendHelp(message);
                return;
            }

            if (command === "projects") {
                await this.handleProjects(message);
                return;
            }

            if (command === "project") {
                await this.handleProject(message, argumentText);
                return;
            }

            if (command === "assistant") {
                await this.handleAssistant(message, argumentText);
                return;
            }

            if (command === "resume") {
                await this.handleResume(message, argumentText);
                return;
            }

            if (command === "ping") {
                await this.reply(message, "pong");
                return;
            }

            await this.reply(message, `Unknown command: \`${command}\`. Use \`${this.options.prefix}help\`.`);
        } catch (error) {
            console.error("[discord] Command handling failed:", error);
            const messageText = error instanceof Error ? error.message : "Unexpected command error.";
            await this.reply(message, `❌ ${messageText}`);
        }
    }

    private async sendHelp(message: Message): Promise<void> {
        const lines = [
            "**Nexus Discord Assistant Commands**",
            `• \`${this.options.prefix}projects\` — list available projects`,
            `• \`${this.options.prefix}project use <project-id>\` — bind this channel to a project`,
            `• \`${this.options.prefix}project current\` — show current bound project`,
            `• \`${this.options.prefix}project clear\` — remove channel project binding`,
            `• \`${this.options.prefix}project context [project-id]\` — show project snapshot`,
            `• \`${this.options.prefix}assistant <question>\` — ask assistant using channel project context`,
            `• \`${this.options.prefix}assistant --project <project-id> <question>\` — ask against a specific project`,
            `• \`${this.options.prefix}resume <task-id>\` — fetch task resume packet`,
        ];
        await this.reply(message, lines.join("\n"));
    }

    private async handleProjects(message: Message): Promise<void> {
        const projects = await this.options.contextService.listProjects();
        if (!projects.length) {
            await this.reply(message, "No projects found in Nexus yet.");
            return;
        }

        const lines = [
            "**Available projects**",
            ...projects.map((project) => `• \`${project.id}\` — ${project.name}`),
        ];
        await this.reply(message, lines.join("\n"));
    }

    private async handleProject(message: Message, argumentText: string): Promise<void> {
        const [subcommandRaw, ...restTokens] = argumentText.split(/\s+/).filter(Boolean);
        const subcommand = (subcommandRaw ?? "").toLowerCase();
        const channelId = message.channelId;

        if (!subcommand) {
            await this.reply(
                message,
                `Usage: \`${this.options.prefix}project use <id>\`, \`${this.options.prefix}project current\`, \`${this.options.prefix}project clear\`, \`${this.options.prefix}project context [id]\``
            );
            return;
        }

        if (subcommand === "use") {
            const projectId = restTokens[0];
            if (!projectId) {
                await this.reply(message, `Usage: \`${this.options.prefix}project use <project-id>\``);
                return;
            }

            const project = await this.options.contextService.bindChannelProject(channelId, projectId);
            await this.reply(
                message,
                `✅ Channel is now connected to **${project.name}** (\`${project.id}\`). Assistant commands will use this project context.`
            );
            return;
        }

        if (subcommand === "current") {
            const bound = await this.options.contextService.getChannelBinding(channelId);
            if (bound) {
                await this.reply(message, `Current channel project: \`${bound}\``);
                return;
            }
            await this.reply(message, "No project is currently bound to this channel.");
            return;
        }

        if (subcommand === "clear") {
            const removed = await this.options.contextService.clearChannelBinding(channelId);
            await this.reply(
                message,
                removed ? "✅ Channel project binding cleared." : "No channel binding existed, nothing to clear."
            );
            return;
        }

        if (subcommand === "context") {
            const explicitProjectId = restTokens[0];
            const { selection, bundle } = await this.options.contextService.getBundleForChannel(channelId, explicitProjectId);
            const header = `Using project \`${selection.projectId}\` (${selection.source} selection)\n`;
            await this.reply(message, `${header}${formatProjectBrief(bundle)}`);
            return;
        }

        await this.reply(message, `Unknown subcommand: \`${subcommand}\`. Try \`${this.options.prefix}help\`.`);
    }

    private async handleAssistant(message: Message, argumentText: string): Promise<void> {
        const parsed = this.parseAssistantArguments(argumentText);
        if (!parsed.question) {
            await this.reply(message, `Usage: \`${this.options.prefix}assistant <question>\``);
            return;
        }

        const response = await this.options.assistantCoordinator.answer(
            message.channelId,
            parsed.question,
            parsed.projectId
        );

        const header = `Using project \`${response.projectId}\` (${response.source} selection) via \`${response.provider}\` assistant.\n`;
        await this.reply(message, `${header}${response.reply}`);
    }

    private async handleResume(message: Message, argumentText: string): Promise<void> {
        const rawTaskId = argumentText.trim();
        const taskId = Number.parseInt(rawTaskId, 10);
        if (!Number.isFinite(taskId) || taskId <= 0) {
            await this.reply(message, `Usage: \`${this.options.prefix}resume <task-id>\``);
            return;
        }

        const packet = await this.options.contextService.getResumePacket(taskId);
        await this.reply(message, formatResumePacket(packet));
    }

    private parseAssistantArguments(argumentText: string): { projectId?: string; question: string } {
        const tokens = argumentText.split(/\s+/).filter(Boolean);
        if (tokens.length >= 3 && tokens[0] === "--project") {
            const projectId = tokens[1];
            const question = tokens.slice(2).join(" ").trim();
            return { projectId, question };
        }

        return { question: argumentText.trim() };
    }

    private async reply(message: Message, text: string): Promise<void> {
        const chunks = chunkMessage(text);
        if (!chunks.length) {
            return;
        }

        await message.reply(chunks[0]);
        for (const chunk of chunks.slice(1)) {
            await message.reply(chunk);
        }
    }
}
