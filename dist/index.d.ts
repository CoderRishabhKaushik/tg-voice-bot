import type { ChildProcessWithoutNullStreams } from "child_process";
export declare class TgVoiceStream {
    apiId: number;
    apiHash: string;
    phone: string;
    loginCode: string | null;
    pyProcess: ChildProcessWithoutNullStreams | null;
    buffer: string;
    constructor(apiId: number, apiHash: string, phone: string, loginCode?: string | null);
    start(): Promise<boolean>;
    play(chatId: number, url: string): void;
    skip(chatId: number): void;
    stop(chatId: number): void;
    playByName(chatId: number, songName: string): Promise<void>;
    private getYouTubeUrl;
    listGroups(): Promise<{
        name: string;
        id: number;
    }[]>;
}
//# sourceMappingURL=index.d.ts.map