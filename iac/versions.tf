terraform {
  required_version = ">= 1.7.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.71"
    }
  }

  backend "azurerm" {
    resource_group_name  = "rg-tfstate-opsynca-ai"
    storage_account_name = "tfstateopsyncaai"
    container_name       = "tfstate"
    key                  = "opsynca-ai.tfstate"
    use_azuread_auth     = true
  }
}
