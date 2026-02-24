import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { Resource } from "@opentelemetry/resources";
import {
  ConsoleSpanExporter,
  InMemorySpanExporter,
  SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";

export interface TelemetryConfig {
  serviceName?: string;
  serviceVersion?: string;
  /** "otlp" | "console" | "memory" | "none" */
  exporter?: string;
  /** OTLP endpoint URL (default: http://localhost:4318/v1/traces) */
  otlpEndpoint?: string;
}

let provider: NodeTracerProvider | null = null;
let memoryExporter: InMemorySpanExporter | null = null;

/**
 * Initialize OpenTelemetry SDK.
 * Reads from env vars if config not provided:
 * - OTEL_EXPORTER: "otlp" | "console" | "memory" | "none" (default: "none")
 * - OTEL_EXPORTER_OTLP_ENDPOINT: OTLP endpoint URL
 * - OTEL_SERVICE_NAME: service name (default: "entropy-research")
 */
export function initTelemetry(config?: TelemetryConfig): void {
  if (provider) return; // Already initialized

  const serviceName =
    config?.serviceName ?? process.env.OTEL_SERVICE_NAME ?? "entropy-research";
  const serviceVersion = config?.serviceVersion ?? "0.0.1";
  const exporterType = config?.exporter ?? process.env.OTEL_EXPORTER ?? "none";

  if (exporterType === "none") return; // No tracing

  const resource = new Resource({
    [ATTR_SERVICE_NAME]: serviceName,
    [ATTR_SERVICE_VERSION]: serviceVersion,
  });

  let spanProcessor: SimpleSpanProcessor;

  switch (exporterType) {
    case "otlp": {
      const endpoint =
        config?.otlpEndpoint ??
        process.env.OTEL_EXPORTER_OTLP_ENDPOINT ??
        "http://localhost:4318/v1/traces";
      const exporter = new OTLPTraceExporter({ url: endpoint });
      spanProcessor = new SimpleSpanProcessor(exporter);
      break;
    }
    case "console":
      spanProcessor = new SimpleSpanProcessor(new ConsoleSpanExporter());
      break;
    case "memory":
      memoryExporter = new InMemorySpanExporter();
      spanProcessor = new SimpleSpanProcessor(memoryExporter);
      break;
    default:
      return; // Unknown exporter type — no tracing
  }

  provider = new NodeTracerProvider({ resource });
  provider.addSpanProcessor(spanProcessor);
  provider.register();
}

/** Get the in-memory exporter (for testing). Returns null if not using memory exporter. */
export function getMemoryExporter(): InMemorySpanExporter | null {
  return memoryExporter;
}

/** Shutdown the OTel SDK gracefully. */
export async function shutdownTelemetry(): Promise<void> {
  if (provider) {
    await provider.shutdown();
    provider = null;
    memoryExporter = null;
  }
}
