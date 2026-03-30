function pickDefined(...values: Array<string | undefined>): string | undefined {
  return values.find((value) => value && value.length > 0);
}

function readPort(rawValue: string | undefined): number {
  const parsed = Number(rawValue ?? '3001');
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 3001;
}

export interface CoreEnv {
  host: string;
  port: number;
}

export function readCoreEnv(): CoreEnv {
  return {
    host:
      pickDefined(process.env.AURELLION_CORE_HOST, process.env.HOST) ??
      '0.0.0.0',
    port: readPort(
      pickDefined(process.env.AURELLION_CORE_PORT, process.env.PORT),
    ),
  };
}
