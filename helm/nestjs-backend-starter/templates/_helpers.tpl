{{- define "starter.name" -}}{{ .Chart.Name }}{{- end -}}
{{- define "starter.fullname" -}}{{ printf "%s-%s" .Release.Name .Chart.Name | trunc 63 | trimSuffix "-" }}{{- end -}}
{{- define "starter.labels" -}}
app.kubernetes.io/name: {{ include "starter.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}
{{- define "starter.selectors" -}}
app.kubernetes.io/name: {{ include "starter.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}
{{- define "starter.image" -}}{{ if .Values.image.digest }}{{ .Values.image.repository }}@{{ .Values.image.digest }}{{ else }}{{ .Values.image.repository }}:{{ .Values.image.tag }}{{ end }}{{- end -}}
