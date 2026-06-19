variable "name" {
  description = "Container App name."
  type        = string
}

variable "resource_group" {
  description = "Resource group name."
  type        = string
}

variable "container_app_environment_id" {
  description = "Container Apps Environment ID."
  type        = string
}

variable "container_name" {
  description = "Container name."
  type        = string
}

variable "image" {
  description = "Container image."
  type        = string
}

variable "target_port" {
  description = "Container ingress target port."
  type        = number
}

variable "cpu" {
  description = "vCPU allocated to the container."
  type        = number
}

variable "memory" {
  description = "Memory allocated to the container."
  type        = string
}

variable "min_replicas" {
  description = "Minimum replicas. Use 0 for scale-to-zero."
  type        = number
}

variable "max_replicas" {
  description = "Maximum replicas."
  type        = number
}

variable "http_concurrency" {
  description = "Concurrent HTTP requests before scaling out."
  type        = number
}

variable "scale_rule_name" {
  description = "HTTP scale rule name."
  type        = string
}

variable "environment_variables" {
  description = "Environment variables. Values may include API keys loaded from backend env files, so the map is treated as sensitive and never rendered in plan/state output."
  type        = map(string)
  default     = {}
  sensitive   = true
}

variable "secret_environment_variables" {
  description = "Environment variables whose value comes from a Container App secret name."
  type        = map(string)
  default     = {}
}

variable "secrets" {
  description = "Container App secrets. Values are stored in Terraform state."
  type        = map(string)
  default     = {}
  sensitive   = true
}

variable "registry" {
  description = "Optional private registry configuration."
  type = object({
    server               = string
    username             = string
    password_secret_name = string
  })
  default = null
}

variable "registry_password" {
  description = "Optional private registry password. Stored in Terraform state."
  type        = string
  default     = null
  sensitive   = true
}

variable "tags" {
  description = "Resource tags."
  type        = map(string)
  default     = {}
}
