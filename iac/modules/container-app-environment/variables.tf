variable "name" {
  description = "Container Apps Environment name."
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

variable "logs_destination" {
  description = "Container Apps logs destination."
  type        = string
}

variable "tags" {
  description = "Resource tags."
  type        = map(string)
  default     = {}
}
