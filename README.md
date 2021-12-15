# GitHub Repository Connector

MI Connector fetches data from GitHub updates to LeanIX workspace using Integration API. Co-ordination and trigger managed by
Integration Hub.

## Inputs

| Parameter            | Mandatory | Section in input object      | Format           | Description                                                                                                                                                                                |
| -------------------- | --------- | ---------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| orgName              | ✅        | connectorConfiguration       | Plain Text       | Name of the github organization to be scanned                                                                                                                                              |
| repoNamesExcludeList | ❌        | connectorConfiguration       | Array of strings | Array of regex expressions to identify repositories, that should not be included in the scanning result, by their names (eg.: ["allThatIncludeThisSubstring", "^start-with", "end-with$"]) |
| ghToken              | ✅        | secretsConfiguration         | Plain Text       | Github token for repository access. It will be hidden in the integrationHub UI. The minimum scope of the token that needs to be set is "admin:org"-"read:org".                             |
| importTeams          | ❌        | connectorConfiguration.flags | boolean          | If you do not use Teams in your GitHub organization, or you don’t want to add them to LeanIX VSM, change the value to "falseb.                                                             |

## Integration Hub Support

#### Connector Template

- vsm-github-connector

## More information

https://leanix.atlassian.net/l/c/0o8XHJoc
