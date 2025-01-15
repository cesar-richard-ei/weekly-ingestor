{{/*
Common authorization rules for API access
*/}}
{{- define "weekly-ingestor.auth-rules" -}}
- from:
  - source:
      principals: ["cluster.local/ns/{{ .Release.Namespace }}/sa/{{ .Values.frontend.name }}"]
- from:
  - source:
      remoteIpBlocks: ["192.168.1.254/32"]  # IP locale (via box)
- from:
  - source:
      remoteIpBlocks: ["10.0.0.0/8"]  # Pour le trafic interne du cluster
{{- end }} 
