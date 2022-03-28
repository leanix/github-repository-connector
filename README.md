# GitHub Repository Connector

MI Connector fetches data from GitHub updates to LeanIX workspace using Integration API. Co-ordination and trigger managed by
Integration Hub.

## Inputs

| Parameter | Mandatory | Section in input object | Format | Description |
| --------- | --------- | ----------------------- | ------ | ----------- |

| orgName | ✅ | connectorConfiguration | Plain Text | Name of the github organization to be scanned |
| repoNamesExcludeList | ❌ | connectorConfiguration | Array of strings | Array of regex expressions to identify repositories, that should not be included in the scanning result, by their names (eg.: ["allThatIncludeThisSubstring", "^start-with", "end-with$"]) |
| repoNamesIncludeList | ❌ | connectorConfiguration | Array of strings | Array of regex expressions to identify repositories, that should only be included in the scanning result, by their names (eg.: ["allThatIncludeThisSubstring", "^start-with", "end-with$"]) |
| repoNamesFilterStrategy | ❌ | connectorConfiguration | Plain Text | Strategy to filter the repositories list. Accepted values 'Include'/'Exclude' |
| ghToken | ✅ | secretsConfiguration | Plain Text | Github token for repository access. It will be hidden in the integrationHub UI. The minimum scope of the token that needs to be set is "admin:org"-"read:org". |
| importTeams | ❌ | connectorConfiguration.flags | boolean | If you do not use Teams in your GitHub organization, or you don’t want to add them to LeanIX VSM, change the value to "false. |
| detectMonoRepos | ❌ | connectorConfiguration.flags | boolean | If flag is true, connector checks for lx manifest file specific to detect mono repo with sub repos. Manifest file name is configured with 'monoRepoManifestFileName' | '' |
| monoRepoManifestFileName | ❌ | connectorConfiguration | Plain Text | Name of the manifest file to search in the GitHub repo tree to identify a sub repo in a mono repo |

## Integration Hub Support

#### Connector Template

- vsm-github-connector

## More information

https://leanix.atlassian.net/l/c/0o8XHJoc
