variable "name" {
  description = "Budget name."
  type        = string
}

variable "subscription_id" {
  description = "Azure subscription resource ID."
  type        = string
}

variable "amount" {
  description = "Monthly budget amount."
  type        = number
}

variable "start_date" {
  description = "Budget start date in RFC3339 format."
  type        = string
}

variable "end_date" {
  description = "Budget end date in RFC3339 format."
  type        = string
}

variable "contact_emails" {
  description = "Budget alert recipients."
  type        = list(string)
}
