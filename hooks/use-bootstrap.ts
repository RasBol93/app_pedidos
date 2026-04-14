"use client";

import { useEffect, useState } from "react";

import { fetchBootstrap } from "@/services/webapp-api";
import type { WebappBootstrap } from "@/types/webapp";

type BootstrapState = {
  data: WebappBootstrap | null;
  isLoading: boolean;
  error: string | null;
};

export function useBootstrap(tenantId: string) {
  const [state, setState] = useState<BootstrapState>({
    data: null,
    isLoading: Boolean(tenantId),
    error: null
  });

  useEffect(() => {
    if (!tenantId) {
      setState({
        data: null,
        isLoading: false,
        error: "Falta tenant_id en la URL."
      });
      return;
    }

    let active = true;

    setState((current) => ({
      ...current,
      isLoading: true,
      error: null
    }));

    fetchBootstrap(tenantId)
      .then((data) => {
        if (!active) {
          return;
        }

        setState({
          data,
          isLoading: false,
          error: null
        });
      })
      .catch((error: Error) => {
        if (!active) {
          return;
        }

        setState({
          data: null,
          isLoading: false,
          error: error.message
        });
      });

    return () => {
      active = false;
    };
  }, [tenantId]);

  return state;
}
