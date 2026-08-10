// intentional duplicated version for migrating to CF workflow API
import createClient from "openapi-fetch";
import type { paths } from "@strengthsync/api-contract";

const baseUrl = import.meta.env.VITE_CF_API_BASE_URL;

export const wf = createClient<paths>({ baseUrl });
