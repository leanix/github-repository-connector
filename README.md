# Github Repository Connector

Implemented in azure durable functions


#  Setting up Azure Durable FunctionApp

- From Azure storage resource (Access Keys)
    - Extract function app name to 'LX_AZ_STORAGE_ACCOUNT_NAME' 
    - Extract function app account key to 'LX_AZ_STORAGE_ACCOUNT_KEY'
    - Add them in functionapp > settings > configuration
- GitHub token is encrypted using openssl. Passphrase or key for decryption is configured in 'LX_ENCRYPTION_PASSPHRASE'
- For Camunda workflow, Create a new host key (functionapp > app keys) as 'camunda_key'.
  This key is used to register the functionapp to Camunda workflow
