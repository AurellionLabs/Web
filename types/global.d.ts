import type { Eip1193Provider } from 'ethers';

declare global {
  interface Window {
    ethereum?: Eip1193Provider & {
      isMetaMask?: boolean;
    };
  }
}

declare module 'aria-query' {
  export const ariaQueryMap: Map<unknown, unknown>;
  export const elementRoles: Map<unknown, unknown>;
}

declare module 'babel__core' {
  export function transformSync(code: string, options?: unknown): unknown;
}

declare module 'babel__generator' {
  export function generate(
    ast: unknown,
    options?: unknown,
    code?: string,
  ): { code: string };
}

declare module 'babel__template' {
  export function template(
    source: string,
    options?: unknown,
  ): (context?: unknown) => unknown;
}

declare module 'babel__traverse' {
  export function traverse(node: unknown, handlers: unknown): void;
}

declare module 'bn.js' {
  export class BN {
    constructor(value: number | string | Uint8Array);
    toString(base?: number): string;
    add(other: BN): BN;
    sub(other: BN): BN;
    mul(other: BN): BN;
    div(other: BN): BN;
    mod(other: BN): BN;
  }
}

declare module 'concat-stream' {
  export default function concatStream(cb: (buf: Buffer) => void): unknown;
}

declare module 'connect' {
  export function createServer(): unknown;
}

declare module 'd3-*' {
  export function scaleLinear(): unknown;
  export function scaleTime(): unknown;
  export function scaleBand(): unknown;
  export function axisBottom(scale: unknown): unknown;
  export function axisLeft(scale: unknown): unknown;
  export function line<T>(): unknown;
  export function area<T>(): unknown;
  export function select(selector: string | Element): unknown;
  export function selectAll(selector: string): unknown;
  export function max(
    data: unknown[],
    accessor?: (d: unknown) => number,
  ): number;
  export function min(
    data: unknown[],
    accessor?: (d: unknown) => number,
  ): number;
  export function extent(
    data: unknown[],
    accessor?: (d: unknown) => number,
  ): [number, number];
  export function range(start: number, stop?: number, step?: number): number[];
  export function interpolate(a: unknown, b: unknown): unknown;
  export function easeLinear(t: number): number;
  export function timeFormat(specifier: string): (date: Date) => string;
  export function timeParse(
    specifier: string,
  ): (dateString: string) => Date | null;
}

declare module 'debug' {
  export default function debug(
    namespace: string,
  ): (...args: unknown[]) => void;
}

declare module 'deep-eql' {
  export default function eql(a: unknown, b: unknown): boolean;
}

declare module 'estree' {
  export interface Node {
    type: string;
    loc?: unknown;
    range?: [number, number];
  }
  export interface Program extends Node {
    body: Node[];
  }
}

declare module 'form-data' {
  export default class FormData {
    append(key: string, value: unknown): void;
  }
}

declare module 'geojson' {
  export interface GeoJSON {
    type: string;
    coordinates?: unknown;
    geometry?: unknown;
    properties?: Record<string, unknown>;
  }
  export interface Feature extends GeoJSON {
    geometry: GeoJSON;
  }
  export interface FeatureCollection extends GeoJSON {
    features: Feature[];
  }
}

declare module 'geojson-vt' {
  export default function geojsonvt(data: unknown, options?: unknown): unknown;
}

declare module 'glob' {
  export function glob(
    pattern: string,
    options?: unknown,
    cb?: (err: unknown, matches: string[]) => void,
  ): Promise<string[]>;
}

declare module 'istanbul-lib-coverage' {
  export function createCoverageMap(data: unknown): unknown;
}

declare module 'istanbul-lib-report' {
  export function createReport(options: unknown): unknown;
}

declare module 'istanbul-reports' {
  export function createReporter(options: unknown): unknown;
}

declare module 'lodash' {
  export function debounce<T extends (...args: unknown[]) => unknown>(
    func: T,
    wait: number,
  ): T;
  export function throttle<T extends (...args: unknown[]) => unknown>(
    func: T,
    wait: number,
  ): T;
  export function omit(obj: unknown, keys: string[]): unknown;
  export function pick(obj: unknown, keys: string[]): unknown;
  export function get(obj: unknown, path: string): unknown;
  export function set(obj: unknown, path: string, value: unknown): void;
  export function chunk(array: unknown[], size: number): unknown[];
  export function groupBy(
    array: unknown[],
    key: string | ((item: unknown) => string),
  ): unknown;
  export function orderBy(
    array: unknown[],
    keys: string[],
    orders: ('asc' | 'desc')[],
  ): unknown[];
  export function uniqBy(
    array: unknown[],
    key: string | ((item: unknown) => unknown),
  ): unknown[];
  export function sumBy(
    array: unknown[],
    key: string | ((item: unknown) => number),
  ): number;
}

declare module 'mapbox__point-geometry' {
  export default class Point {
    constructor(x: number, y: number);
    x: number;
    y: number;
  }
}

declare module 'minimatch' {
  export default function minimatch(
    path: string,
    pattern: string,
    options?: unknown,
  ): boolean;
}

declare module 'ms' {
  export default function ms(value: string | number): number;
}

declare module 'pbf' {
  export default class Pbf {
    constructor(buffer: Uint8Array);
    readVarint(): number;
    readString(): string;
    readBytes(): Uint8Array;
    writeVarint(value: number): void;
    writeString(value: string): void;
    writeBytes(value: Uint8Array): void;
    finish(): Uint8Array;
  }
}

declare module 'pbkdf2' {
  export default function pbkdf2(
    password: string | Uint8Array,
    salt: string | Uint8Array,
    iterations: number,
    keylen: number,
    digest: string,
    callback: (err: unknown, derivedKey: Uint8Array) => void,
  ): void;
}

declare module 'prettier' {
  export function format(code: string, options?: unknown): Promise<string>;
  export function getFileInfo(
    path: string,
    options?: unknown,
  ): Promise<{ inferredParser: string }>;
}

declare module 'prop-types' {
  export function shape(props: Record<string, unknown>): unknown;
  export function arrayOf(type: unknown): unknown;
  export function oneOf(types: unknown[]): unknown;
  export function instanceOf(type: unknown): unknown;
}

declare module 'qs' {
  export default function parse(
    str: string,
    options?: unknown,
  ): Record<string, unknown>;
  export default function stringify(
    obj: Record<string, unknown>,
    options?: unknown,
  ): string;
}

declare module 'secp256k1' {
  export function createPrivateKey(): Uint8Array;
  export function createPublicKey(privateKey: Uint8Array): Uint8Array;
  export function sign(message: Uint8Array, privateKey: Uint8Array): Uint8Array;
  export function verify(
    signature: Uint8Array,
    message: Uint8Array,
    publicKey: Uint8Array,
  ): boolean;
}

declare module 'sinonjs__fake-timers' {
  export function install(
    globalObject?: unknown,
    options?: unknown,
  ): { uninstall(): void };
}

declare module 'sizzle' {
  export default function sizzle(
    selector: string,
    context?: Element,
  ): Element[];
}

declare module 'stack-utils' {
  export default function stackUtils(
    input: string,
  ): { column: number; line: number; file: string; method?: string }[];
}

declare module 'stylis' {
  export default function stylis(selector: string, rules: string): string;
}

declare module 'supercluster' {
  export default class Supercluster {
    constructor(options: { radius: number; maxZoom: number });
    load(
      points: Array<{
        x: number;
        y: number;
        properties?: Record<string, unknown>;
      }>,
    ): void;
    query(
      bounds: { minX: number; minY: number; maxX: number; maxY: number },
      zoom: number,
    ): Array<{ x: number; y: number; properties: Record<string, unknown> }>;
  }
}

declare module 'trusted-types' {
  export function createPolicy(
    policyName: string,
    policyOptions: Record<string, unknown>,
  ): unknown;
}

declare module 'uuid' {
  export function v4(): string;
  export function validate(uuid: string): boolean;
}

declare module 'ws' {
  export default class WebSocket {
    constructor(address: string, protocols?: string | string[]);
    send(data: string | Uint8Array): void;
    close(code?: number, reason?: string): void;
    on(event: 'open' | 'close' | 'error', handler: () => void): void;
    on(event: 'message', handler: (data: string | Uint8Array) => void): void;
    readyState: number;
    OPEN: number;
    CLOSED: number;
  }
}

declare module 'yargs' {
  export default function yargs(argv: string[]): {
    option(key: string, config: unknown): unknown;
    parse(): Record<string, unknown>;
    argv: Record<string, unknown>;
  };
}

declare module 'yargs-parser' {
  export default function parse(
    argv: string[],
    opts?: unknown,
  ): Record<string, unknown>;
}

declare module 'yauzl' {
  export default class Yauzl {
    constructor(buffer: Uint8Array, options?: unknown);
    on(event: 'entry', handler: (entry: { fileName: string }) => void): void;
    readEntry(): void;
    openReadStream(
      entry: unknown,
      cb: (err: unknown, stream: unknown) => void,
    ): void;
    end(): void;
  }
}

// This is required to make this file a module
export {};
