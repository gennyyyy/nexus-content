export interface ChannelBindingRepository {
    getProjectId(channelId: string): Promise<string | null>;
    setProjectId(channelId: string, projectId: string): Promise<void>;
    clearProjectId(channelId: string): Promise<boolean>;
}
