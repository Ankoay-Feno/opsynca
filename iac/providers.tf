provider "azurerm" {
  features {}

  subscription_id = var.subscription_id
}

data "azurerm_subscription" "current" {}
