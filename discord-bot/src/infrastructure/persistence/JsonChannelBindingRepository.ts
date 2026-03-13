import path from "node:path";
import { promises as fs } from "node:fs";
import type { ChannelBindingRepository } from "../../domain/ports/ChannelBindingRepository.js";

interface ChannelBindingRecord {
    projectId: string;
    updatedAt: string;
}

interface ChannelBindingDocument {
    version: number;
    channels: Record<string, ChannelBindingRecord>;
}

const CURRENT_SCHEMA_VERSION = 1;

export class JsonChannelBindingRepository implements ChannelBindingRepository {
    private readonly filePath: string;
    private cache: ChannelBindingDocument | null = null;

    constructor(filePath: string) {
        this.filePath = path.resolve(process.cwd(), filePath);
    }

    async getProjectId(channelId: string): Promise<string | null> {
        const document = await this.readDocument();
        return document.channels[channelId]?.projectId ?? null;
    }

    async setProjectId(channelId: string, projectId: string): Promise<void> {
        const document = await this.readDocument();
        document.channels[channelId] = {
            projectId,
            updatedAt: new Date().toISOString(),
        };
        await this.writeDocument(document);
    }

    async clearProjectId(channelId: string): Promise<boolean> {
        const document = await this.readDocument();
        if (!(channelId in document.channels)) {
            return false;
        }

        delete document.channels[channelId];
        await this.writeDocument(document);
        return true;
    }

    private async readDocument(): Promise<ChannelBindingDocument> {
        if (this.cache) {
            return this.cache;
        }

        await fs.mkdir(path.dirname(this.filePath), { recursive: true });

        try {
            const raw = await fs.readFile(this.filePath, "utf8");
            const parsed = JSON.parse(raw) as Partial<ChannelBindingDocument>;
            const hydrated: ChannelBindingDocument = {
                version: parsed.version ?? CURRENT_SCHEMA_VERSION,
                channels: parsed.channels ?? {},
            };
            this.cache = hydrated;
            return hydrated;
        } catch (error) {
            const err = error as NodeJS.ErrnoException;
            if (err.code !== "ENOENT") {
                throw error;
            }

            const initialDocument: ChannelBindingDocument = {
                version: CURRENT_SCHEMA_VERSION,
                channels: {},
            };
            this.cache = initialDocument;
            await this.writeDocument(initialDocument);
            return initialDocument;
        }
    }

    private async writeDocument(document: ChannelBindingDocument): Promise<void> {
        this.cache = document;
        await fs.writeFile(this.filePath, JSON.stringify(document, null, 2), "utf8");
    }
}
