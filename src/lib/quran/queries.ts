import { queryOptions } from "@tanstack/react-query";
import { fetchQuranMeta } from "./service";

export const quranMetaQuery = queryOptions({
  queryKey: ["quran", "meta"],
  queryFn: fetchQuranMeta,
  staleTime: Infinity,
  gcTime: Infinity,
  retry: 2,
});
