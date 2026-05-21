variable "name" {
  description = "Static Web App name."
  type        = string
}

variable "location" {
  description = "Azure region."
  type        = string
}

variable "resource_group" {
  description = "Resource group name."
  type        = string
}

variable "app_settings" {
  description = "Static Web App settings loaded from frontend env JSON. For Vite build-time values, also pass these to CI."
  type        = map(string)
  default     = {}
}

variable "tags" {
  description = "Resource tags."
  type        = map(string)
  default     = {}
}
