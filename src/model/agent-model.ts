import type { ModelRequest } from "./model-request.js";
import type { ModelResponse } from "./model-response.js";

export interface AgentModel {
  complete(request: ModelRequest): Promise<ModelResponse>;
}
