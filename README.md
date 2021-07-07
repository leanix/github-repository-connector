# GitHub Repository Connector

MI Connector fetches data from GitHub updates to LeanIX workspace using Integration API. Co-ordination and trigger managed by
Integration Hub.

## Inputs

Parameter | Mandatory | Format |
--- | --- | --- | 
orgName | ✅ | Plain
ghToken | ✅ | Encrypted

## Integration Hub Support
#### Connector Template 
- github-repository-connector 


## Setting up Azure Durable FunctionApp

- Create new Integration Hub connector template
- Set following application parameters in `functionapp > settings > configuration`
    - ~~From Azure storage resource (Access Keys), name to 'LX_AZ_STORAGE_ACCOUNT_NAME'~~
    - ~~From Azure storage resource (Access Keys), account key to 'LX_AZ_STORAGE_ACCOUNT_KEY'~~
    - Openssl encrypted GitHub token to 'LX_ENCRYPTION_PASSPHRASE'
- ~~For Camunda workflow, Create a new host key (functionapp > app keys) as 'camunda_key'. This key is used to register the
  functionapp to Camunda workflow~~ **Responsibility taken over by Integration Hub**

## More information 

https://leanix.atlassian.net/l/c/0o8XHJoc
