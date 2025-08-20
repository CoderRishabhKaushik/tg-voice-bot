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
}
//# sourceMappingURL=index.d.ts.map