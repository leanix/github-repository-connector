/*
 * This function is not intended to be invoked directly. Instead it will be
 * triggered by an orchestrator function.
 * 
 * Before running this sample, please:
 * - create a Durable orchestration function
 * - create a Durable HTTP starter function
 * - run 'npm install durable-functions' from the wwwroot folder of your
 *   function app in Kudu
 */

module.exports = async function (context, repoIds) {
    context.log('partial act func called', repoIds);
    const data = getReposData(repoIds)
    return data;
};

function getReposData(repoIds) {
    //storing dummy data of 20 repos with languages and labels populated
    const data = [
        {
          "name": "leanix-sdk-php",
          "id": "MDEwOlJlcG9zaXRvcnkxNDY2OTg3Ng==",
          "nameWithOwner": "leanix/leanix-sdk-php",
          "description": "SDK for PHP to access leanIX REST API",
          "createdAt": "2013-11-24T21:40:23Z",
          "isArchived": false,
          "updatedAt": "2020-06-08T20:19:40Z",
          "languages": {
            "edges": [
              {
                "node": {
                  "name": "Scala",
                  "id": "MDg6TGFuZ3VhZ2UxNjk="
                }
              },
              {
                "node": {
                  "name": "PHP",
                  "id": "MDg6TGFuZ3VhZ2UxNTE="
                }
              },
              {
                "node": {
                  "name": "HTML",
                  "id": "MDg6TGFuZ3VhZ2U0MTc="
                }
              }
            ]
          },
          "labels": {
            "edges": [
              {
                "node": {
                  "name": "bug",
                  "color": "fc2929",
                  "description": null,
                  "id": "MDU6TGFiZWw2NzUwODE3Ng=="
                }
              },
              {
                "node": {
                  "name": "duplicate",
                  "color": "cccccc",
                  "description": null,
                  "id": "MDU6TGFiZWw2NzUwODE3Nw=="
                }
              },
              {
                "node": {
                  "name": "enhancement",
                  "color": "84b6eb",
                  "description": null,
                  "id": "MDU6TGFiZWw2NzUwODE3OA=="
                }
              },
              {
                "node": {
                  "name": "invalid",
                  "color": "e6e6e6",
                  "description": null,
                  "id": "MDU6TGFiZWw2NzUwODE3OQ=="
                }
              },
              {
                "node": {
                  "name": "question",
                  "color": "cc317c",
                  "description": null,
                  "id": "MDU6TGFiZWw2NzUwODE4MA=="
                }
              },
              {
                "node": {
                  "name": "wontfix",
                  "color": "ffffff",
                  "description": null,
                  "id": "MDU6TGFiZWw2NzUwODE4MQ=="
                }
              }
            ]
          }
        },
        {
          "name": "leanix-sdk-java",
          "id": "MDEwOlJlcG9zaXRvcnkxNDY2OTg5MQ==",
          "nameWithOwner": "leanix/leanix-sdk-java",
          "description": "SDK for Java to access leanIX REST API",
          "createdAt": "2013-11-24T21:41:18Z",
          "isArchived": false,
          "updatedAt": "2020-12-23T04:26:33Z",
          "languages": {
            "edges": [
              {
                "node": {
                  "name": "Java",
                  "id": "MDg6TGFuZ3VhZ2UxNTg="
                }
              }
            ]
          },
          "labels": {
            "edges": [
              {
                "node": {
                  "name": "bug",
                  "color": "fc2929",
                  "description": null,
                  "id": "MDU6TGFiZWw2NzUwODI2Ng=="
                }
              },
              {
                "node": {
                  "name": "duplicate",
                  "color": "cccccc",
                  "description": null,
                  "id": "MDU6TGFiZWw2NzUwODI2Nw=="
                }
              },
              {
                "node": {
                  "name": "enhancement",
                  "color": "84b6eb",
                  "description": null,
                  "id": "MDU6TGFiZWw2NzUwODI2OA=="
                }
              },
              {
                "node": {
                  "name": "invalid",
                  "color": "e6e6e6",
                  "description": null,
                  "id": "MDU6TGFiZWw2NzUwODI2OQ=="
                }
              },
              {
                "node": {
                  "name": "question",
                  "color": "cc317c",
                  "description": null,
                  "id": "MDU6TGFiZWw2NzUwODI3MA=="
                }
              },
              {
                "node": {
                  "name": "wontfix",
                  "color": "ffffff",
                  "description": null,
                  "id": "MDU6TGFiZWw2NzUwODI3MQ=="
                }
              },
              {
                "node": {
                  "name": "dependencies",
                  "color": "0366d6",
                  "description": "Pull requests that update a dependency file",
                  "id": "MDU6TGFiZWwyNjAyOTQzNTU5"
                }
              }
            ]
          }
        },
        {
          "name": "leanix-sdk-ios",
          "id": "MDEwOlJlcG9zaXRvcnkxNDY3MDM1Nw==",
          "nameWithOwner": "leanix/leanix-sdk-ios",
          "description": "SDK for IOS to access leanIX REST API",
          "createdAt": "2013-11-24T22:06:19Z",
          "isArchived": false,
          "updatedAt": "2020-06-08T20:34:25Z",
          "languages": {
            "edges": []
          },
          "labels": {
            "edges": [
              {
                "node": {
                  "name": "bug",
                  "color": "fc2929",
                  "description": null,
                  "id": "MDU6TGFiZWw2NzUxMTA3OQ=="
                }
              },
              {
                "node": {
                  "name": "duplicate",
                  "color": "cccccc",
                  "description": null,
                  "id": "MDU6TGFiZWw2NzUxMTA4MA=="
                }
              },
              {
                "node": {
                  "name": "enhancement",
                  "color": "84b6eb",
                  "description": null,
                  "id": "MDU6TGFiZWw2NzUxMTA4MQ=="
                }
              },
              {
                "node": {
                  "name": "invalid",
                  "color": "e6e6e6",
                  "description": null,
                  "id": "MDU6TGFiZWw2NzUxMTA4Mg=="
                }
              },
              {
                "node": {
                  "name": "question",
                  "color": "cc317c",
                  "description": null,
                  "id": "MDU6TGFiZWw2NzUxMTA4Mw=="
                }
              },
              {
                "node": {
                  "name": "wontfix",
                  "color": "ffffff",
                  "description": null,
                  "id": "MDU6TGFiZWw2NzUxMTA4NA=="
                }
              }
            ]
          }
        },
        {
          "name": "leanix-sdk-csharp",
          "id": "MDEwOlJlcG9zaXRvcnkxNjM3MzQyNQ==",
          "nameWithOwner": "leanix/leanix-sdk-csharp",
          "description": "SDK for C# to access leanIX REST API",
          "createdAt": "2014-01-30T09:44:30Z",
          "isArchived": false,
          "updatedAt": "2020-06-08T20:20:29Z",
          "languages": {
            "edges": [
              {
                "node": {
                  "name": "C#",
                  "id": "MDg6TGFuZ3VhZ2UyMzI="
                }
              },
              {
                "node": {
                  "name": "Scala",
                  "id": "MDg6TGFuZ3VhZ2UxNjk="
                }
              },
              {
                "node": {
                  "name": "HTML",
                  "id": "MDg6TGFuZ3VhZ2U0MTc="
                }
              },
              {
                "node": {
                  "name": "Shell",
                  "id": "MDg6TGFuZ3VhZ2UxMzk="
                }
              }
            ]
          },
          "labels": {
            "edges": [
              {
                "node": {
                  "name": "bug",
                  "color": "fc2929",
                  "description": null,
                  "id": "MDU6TGFiZWw3Nzc4MjYwMg=="
                }
              },
              {
                "node": {
                  "name": "duplicate",
                  "color": "cccccc",
                  "description": null,
                  "id": "MDU6TGFiZWw3Nzc4MjYwMw=="
                }
              },
              {
                "node": {
                  "name": "enhancement",
                  "color": "84b6eb",
                  "description": null,
                  "id": "MDU6TGFiZWw3Nzc4MjYwNA=="
                }
              },
              {
                "node": {
                  "name": "invalid",
                  "color": "e6e6e6",
                  "description": null,
                  "id": "MDU6TGFiZWw3Nzc4MjYwNQ=="
                }
              },
              {
                "node": {
                  "name": "question",
                  "color": "cc317c",
                  "description": null,
                  "id": "MDU6TGFiZWw3Nzc4MjYwNg=="
                }
              },
              {
                "node": {
                  "name": "wontfix",
                  "color": "ffffff",
                  "description": null,
                  "id": "MDU6TGFiZWw3Nzc4MjYwNw=="
                }
              }
            ]
          }
        },
        {
          "name": "leanix-website",
          "id": "MDEwOlJlcG9zaXRvcnkxOTIzNjQwMA==",
          "nameWithOwner": "leanix/leanix-website",
          "description": "leanIX Website",
          "createdAt": "2014-04-28T11:30:24Z",
          "isArchived": true,
          "updatedAt": "2019-06-19T08:05:41Z",
          "languages": {
            "edges": [
              {
                "node": {
                  "name": "JavaScript",
                  "id": "MDg6TGFuZ3VhZ2UxNDA="
                }
              },
              {
                "node": {
                  "name": "Shell",
                  "id": "MDg6TGFuZ3VhZ2UxMzk="
                }
              },
              {
                "node": {
                  "name": "CSS",
                  "id": "MDg6TGFuZ3VhZ2UzMDg="
                }
              },
              {
                "node": {
                  "name": "PHP",
                  "id": "MDg6TGFuZ3VhZ2UxNTE="
                }
              },
              {
                "node": {
                  "name": "Makefile",
                  "id": "MDg6TGFuZ3VhZ2U0MDM="
                }
              },
              {
                "node": {
                  "name": "HTML",
                  "id": "MDg6TGFuZ3VhZ2U0MTc="
                }
              },
              {
                "node": {
                  "name": "Batchfile",
                  "id": "MDg6TGFuZ3VhZ2U0NjM="
                }
              }
            ]
          },
          "labels": {
            "edges": [
              {
                "node": {
                  "name": "bug",
                  "color": "fc2929",
                  "description": null,
                  "id": "MDU6TGFiZWw5NTY5OTcxOA=="
                }
              },
              {
                "node": {
                  "name": "duplicate",
                  "color": "cccccc",
                  "description": null,
                  "id": "MDU6TGFiZWw5NTY5OTcxOQ=="
                }
              },
              {
                "node": {
                  "name": "enhancement",
                  "color": "84b6eb",
                  "description": null,
                  "id": "MDU6TGFiZWw5NTY5OTcyMA=="
                }
              },
              {
                "node": {
                  "name": "help wanted",
                  "color": "159818",
                  "description": null,
                  "id": "MDU6TGFiZWw5NTY5OTcyMQ=="
                }
              },
              {
                "node": {
                  "name": "invalid",
                  "color": "e6e6e6",
                  "description": null,
                  "id": "MDU6TGFiZWw5NTY5OTcyMg=="
                }
              },
              {
                "node": {
                  "name": "question",
                  "color": "cc317c",
                  "description": null,
                  "id": "MDU6TGFiZWw5NTY5OTcyMw=="
                }
              },
              {
                "node": {
                  "name": "wontfix",
                  "color": "ffffff",
                  "description": null,
                  "id": "MDU6TGFiZWw5NTY5OTcyNA=="
                }
              }
            ]
          }
        },
        {
          "name": "leanix-web-test",
          "id": "MDEwOlJlcG9zaXRvcnkxOTI0MzE4Mw==",
          "nameWithOwner": "leanix/leanix-web-test",
          "description": "User Interface tests for Web Application",
          "createdAt": "2014-04-28T15:15:35Z",
          "isArchived": false,
          "updatedAt": "2020-06-08T20:33:39Z",
          "languages": {
            "edges": [
              {
                "node": {
                  "name": "PHP",
                  "id": "MDg6TGFuZ3VhZ2UxNTE="
                }
              },
              {
                "node": {
                  "name": "CSS",
                  "id": "MDg6TGFuZ3VhZ2UzMDg="
                }
              },
              {
                "node": {
                  "name": "JavaScript",
                  "id": "MDg6TGFuZ3VhZ2UxNDA="
                }
              },
              {
                "node": {
                  "name": "Groovy",
                  "id": "MDg6TGFuZ3VhZ2UxNzU="
                }
              },
              {
                "node": {
                  "name": "ApacheConf",
                  "id": "MDg6TGFuZ3VhZ2U0MTg="
                }
              },
              {
                "node": {
                  "name": "HTML",
                  "id": "MDg6TGFuZ3VhZ2U0MTc="
                }
              },
              {
                "node": {
                  "name": "Batchfile",
                  "id": "MDg6TGFuZ3VhZ2U0NjM="
                }
              },
              {
                "node": {
                  "name": "Erlang",
                  "id": "MDg6TGFuZ3VhZ2UxNTM="
                }
              },
              {
                "node": {
                  "name": "Shell",
                  "id": "MDg6TGFuZ3VhZ2UxMzk="
                }
              }
            ]
          },
          "labels": {
            "edges": [
              {
                "node": {
                  "name": "bug",
                  "color": "fc2929",
                  "description": null,
                  "id": "MDU6TGFiZWw5NTc0NzA2Mg=="
                }
              },
              {
                "node": {
                  "name": "duplicate",
                  "color": "cccccc",
                  "description": null,
                  "id": "MDU6TGFiZWw5NTc0NzA2Mw=="
                }
              },
              {
                "node": {
                  "name": "enhancement",
                  "color": "84b6eb",
                  "description": null,
                  "id": "MDU6TGFiZWw5NTc0NzA2NA=="
                }
              },
              {
                "node": {
                  "name": "help wanted",
                  "color": "159818",
                  "description": null,
                  "id": "MDU6TGFiZWw5NTc0NzA2NQ=="
                }
              },
              {
                "node": {
                  "name": "invalid",
                  "color": "e6e6e6",
                  "description": null,
                  "id": "MDU6TGFiZWw5NTc0NzA2Ng=="
                }
              },
              {
                "node": {
                  "name": "question",
                  "color": "cc317c",
                  "description": null,
                  "id": "MDU6TGFiZWw5NTc0NzA2Nw=="
                }
              },
              {
                "node": {
                  "name": "wontfix",
                  "color": "ffffff",
                  "description": null,
                  "id": "MDU6TGFiZWw5NTc0NzA2OA=="
                }
              }
            ]
          }
        },
        {
          "name": "leanix-eam",
          "id": "MDEwOlJlcG9zaXRvcnkxOTI2ODIyOA==",
          "nameWithOwner": "leanix/leanix-eam",
          "description": "leanIX EAM",
          "createdAt": "2014-04-29T07:48:37Z",
          "isArchived": false,
          "updatedAt": "2020-06-08T19:47:09Z",
          "languages": {
            "edges": [
              {
                "node": {
                  "name": "JavaScript",
                  "id": "MDg6TGFuZ3VhZ2UxNDA="
                }
              },
              {
                "node": {
                  "name": "Shell",
                  "id": "MDg6TGFuZ3VhZ2UxMzk="
                }
              },
              {
                "node": {
                  "name": "CSS",
                  "id": "MDg6TGFuZ3VhZ2UzMDg="
                }
              },
              {
                "node": {
                  "name": "PHP",
                  "id": "MDg6TGFuZ3VhZ2UxNTE="
                }
              },
              {
                "node": {
                  "name": "HTML",
                  "id": "MDg6TGFuZ3VhZ2U0MTc="
                }
              }
            ]
          },
          "labels": {
            "edges": [
              {
                "node": {
                  "name": "bug",
                  "color": "fc2929",
                  "description": null,
                  "id": "MDU6TGFiZWw5NTkyMzA1OA=="
                }
              },
              {
                "node": {
                  "name": "duplicate",
                  "color": "cccccc",
                  "description": null,
                  "id": "MDU6TGFiZWw5NTkyMzA1OQ=="
                }
              },
              {
                "node": {
                  "name": "enhancement",
                  "color": "84b6eb",
                  "description": null,
                  "id": "MDU6TGFiZWw5NTkyMzA2MA=="
                }
              },
              {
                "node": {
                  "name": "help wanted",
                  "color": "159818",
                  "description": null,
                  "id": "MDU6TGFiZWw5NTkyMzA2MQ=="
                }
              },
              {
                "node": {
                  "name": "invalid",
                  "color": "e6e6e6",
                  "description": null,
                  "id": "MDU6TGFiZWw5NTkyMzA2Mg=="
                }
              },
              {
                "node": {
                  "name": "question",
                  "color": "cc317c",
                  "description": null,
                  "id": "MDU6TGFiZWw5NTkyMzA2Mw=="
                }
              },
              {
                "node": {
                  "name": "wontfix",
                  "color": "ffffff",
                  "description": null,
                  "id": "MDU6TGFiZWw5NTkyMzA2NA=="
                }
              }
            ]
          }
        },
        {
          "name": "leanix-mtm",
          "id": "MDEwOlJlcG9zaXRvcnkyMjA1ODgyNg==",
          "nameWithOwner": "leanix/leanix-mtm",
          "description": "Multi-tenancy server",
          "createdAt": "2014-07-21T09:29:27Z",
          "isArchived": false,
          "updatedAt": "2021-04-20T07:20:53Z",
          "languages": {
            "edges": [
              {
                "node": {
                  "name": "Shell",
                  "id": "MDg6TGFuZ3VhZ2UxMzk="
                }
              },
              {
                "node": {
                  "name": "Java",
                  "id": "MDg6TGFuZ3VhZ2UxNTg="
                }
              },
              {
                "node": {
                  "name": "JavaScript",
                  "id": "MDg6TGFuZ3VhZ2UxNDA="
                }
              },
              {
                "node": {
                  "name": "CSS",
                  "id": "MDg6TGFuZ3VhZ2UzMDg="
                }
              },
              {
                "node": {
                  "name": "FreeMarker",
                  "id": "MDg6TGFuZ3VhZ2U0ODY="
                }
              },
              {
                "node": {
                  "name": "Dockerfile",
                  "id": "MDg6TGFuZ3VhZ2U1MzU="
                }
              },
              {
                "node": {
                  "name": "Mustache",
                  "id": "MDg6TGFuZ3VhZ2U3NzY="
                }
              }
            ]
          },
          "labels": {
            "edges": [
              {
                "node": {
                  "name": "educational",
                  "color": "7fbce8",
                  "description": "PR contains references on how to implement a certain behaviour.",
                  "id": "MDU6TGFiZWwxMTU1NDcxODQ="
                }
              },
              {
                "node": {
                  "name": "obsolete",
                  "color": "d6f7a5",
                  "description": "PR is obsolete due to a story that won't be fixed or because there is a newer branch.",
                  "id": "MDU6TGFiZWwxMTU1NDcxODU="
                }
              },
              {
                "node": {
                  "name": "spike",
                  "color": "fced99",
                  "description": "PR contains a proof-of-concept or example implementation used within a spike story.",
                  "id": "MDU6TGFiZWwxMTU1NDcxODY="
                }
              },
              {
                "node": {
                  "name": "do not merge",
                  "color": "ff8b87",
                  "description": "PR cannot be merged because it's unfinished or depending on another PR.",
                  "id": "MDU6TGFiZWwxMTExMjEwMTM5"
                }
              },
              {
                "node": {
                  "name": "INVENT",
                  "color": "f9f157",
                  "description": "team invent",
                  "id": "MDU6TGFiZWwyMDQwNDkyODU2"
                }
              }
            ]
          }
        },
        {
          "name": "leanix-mtm-sdk-java",
          "id": "MDEwOlJlcG9zaXRvcnkyMjUxNDEwMg==",
          "nameWithOwner": "leanix/leanix-mtm-sdk-java",
          "description": "leanIX MTM SDK for Java",
          "createdAt": "2014-08-01T14:44:59Z",
          "isArchived": false,
          "updatedAt": "2020-12-21T15:10:18Z",
          "languages": {
            "edges": [
              {
                "node": {
                  "name": "Shell",
                  "id": "MDg6TGFuZ3VhZ2UxMzk="
                }
              },
              {
                "node": {
                  "name": "Java",
                  "id": "MDg6TGFuZ3VhZ2UxNTg="
                }
              }
            ]
          },
          "labels": {
            "edges": [
              {
                "node": {
                  "name": "bug",
                  "color": "fc2929",
                  "description": null,
                  "id": "MDU6TGFiZWwxMTg3NTYxNzY="
                }
              },
              {
                "node": {
                  "name": "duplicate",
                  "color": "cccccc",
                  "description": null,
                  "id": "MDU6TGFiZWwxMTg3NTYxNzc="
                }
              },
              {
                "node": {
                  "name": "enhancement",
                  "color": "84b6eb",
                  "description": null,
                  "id": "MDU6TGFiZWwxMTg3NTYxNzg="
                }
              },
              {
                "node": {
                  "name": "help wanted",
                  "color": "159818",
                  "description": null,
                  "id": "MDU6TGFiZWwxMTg3NTYxNzk="
                }
              },
              {
                "node": {
                  "name": "invalid",
                  "color": "e6e6e6",
                  "description": null,
                  "id": "MDU6TGFiZWwxMTg3NTYxODA="
                }
              },
              {
                "node": {
                  "name": "question",
                  "color": "cc317c",
                  "description": null,
                  "id": "MDU6TGFiZWwxMTg3NTYxODE="
                }
              },
              {
                "node": {
                  "name": "wontfix",
                  "color": "ffffff",
                  "description": null,
                  "id": "MDU6TGFiZWwxMTg3NTYxODI="
                }
              },
              {
                "node": {
                  "name": "WIP",
                  "color": "50d8a2",
                  "description": "",
                  "id": "MDU6TGFiZWw5NzY3OTc3ODY="
                }
              }
            ]
          }
        },
        {
          "name": "leanix-idp-leanix",
          "id": "MDEwOlJlcG9zaXRvcnkyMjYwMzExNw==",
          "nameWithOwner": "leanix/leanix-idp-leanix",
          "description": null,
          "createdAt": "2014-08-04T12:24:08Z",
          "isArchived": false,
          "updatedAt": "2021-03-16T10:10:38Z",
          "languages": {
            "edges": [
              {
                "node": {
                  "name": "Shell",
                  "id": "MDg6TGFuZ3VhZ2UxMzk="
                }
              },
              {
                "node": {
                  "name": "Java",
                  "id": "MDg6TGFuZ3VhZ2UxNTg="
                }
              },
              {
                "node": {
                  "name": "CSS",
                  "id": "MDg6TGFuZ3VhZ2UzMDg="
                }
              },
              {
                "node": {
                  "name": "Dockerfile",
                  "id": "MDg6TGFuZ3VhZ2U1MzU="
                }
              },
              {
                "node": {
                  "name": "HTML",
                  "id": "MDg6TGFuZ3VhZ2U0MTc="
                }
              }
            ]
          },
          "labels": {
            "edges": [
              {
                "node": {
                  "name": "bug",
                  "color": "fc2929",
                  "description": null,
                  "id": "MDU6TGFiZWwxMTkzODIwOTc="
                }
              },
              {
                "node": {
                  "name": "duplicate",
                  "color": "cccccc",
                  "description": null,
                  "id": "MDU6TGFiZWwxMTkzODIwOTg="
                }
              },
              {
                "node": {
                  "name": "enhancement",
                  "color": "84b6eb",
                  "description": null,
                  "id": "MDU6TGFiZWwxMTkzODIwOTk="
                }
              },
              {
                "node": {
                  "name": "help wanted",
                  "color": "159818",
                  "description": null,
                  "id": "MDU6TGFiZWwxMTkzODIxMDA="
                }
              },
              {
                "node": {
                  "name": "invalid",
                  "color": "e6e6e6",
                  "description": null,
                  "id": "MDU6TGFiZWwxMTkzODIxMDE="
                }
              },
              {
                "node": {
                  "name": "question",
                  "color": "cc317c",
                  "description": null,
                  "id": "MDU6TGFiZWwxMTkzODIxMDI="
                }
              },
              {
                "node": {
                  "name": "wontfix",
                  "color": "ffffff",
                  "description": null,
                  "id": "MDU6TGFiZWwxMTkzODIxMDM="
                }
              },
              {
                "node": {
                  "name": "do-not-merge",
                  "color": "d93f0b",
                  "description": "",
                  "id": "MDU6TGFiZWwyNTg1MDgyNTAy"
                }
              }
            ]
          }
        },
        {
          "name": "codetalks_2014_demo",
          "id": "MDEwOlJlcG9zaXRvcnkyNDM4NDEwMA==",
          "nameWithOwner": "leanix/codetalks_2014_demo",
          "description": "This repository contains the demo shown during the talk on CodeTalks 2014",
          "createdAt": "2014-09-23T18:27:17Z",
          "isArchived": false,
          "updatedAt": "2014-09-24T08:42:27Z",
          "languages": {
            "edges": [
              {
                "node": {
                  "name": "Ruby",
                  "id": "MDg6TGFuZ3VhZ2UxNDE="
                }
              },
              {
                "node": {
                  "name": "Shell",
                  "id": "MDg6TGFuZ3VhZ2UxMzk="
                }
              }
            ]
          },
          "labels": {
            "edges": [
              {
                "node": {
                  "name": "bug",
                  "color": "fc2929",
                  "description": null,
                  "id": "MDU6TGFiZWwxMzE5MzY2NDM="
                }
              },
              {
                "node": {
                  "name": "duplicate",
                  "color": "cccccc",
                  "description": null,
                  "id": "MDU6TGFiZWwxMzE5MzY2NDQ="
                }
              },
              {
                "node": {
                  "name": "enhancement",
                  "color": "84b6eb",
                  "description": null,
                  "id": "MDU6TGFiZWwxMzE5MzY2NDU="
                }
              },
              {
                "node": {
                  "name": "help wanted",
                  "color": "159818",
                  "description": null,
                  "id": "MDU6TGFiZWwxMzE5MzY2NDY="
                }
              },
              {
                "node": {
                  "name": "invalid",
                  "color": "e6e6e6",
                  "description": null,
                  "id": "MDU6TGFiZWwxMzE5MzY2NDc="
                }
              },
              {
                "node": {
                  "name": "question",
                  "color": "cc317c",
                  "description": null,
                  "id": "MDU6TGFiZWwxMzE5MzY2NDg="
                }
              },
              {
                "node": {
                  "name": "wontfix",
                  "color": "ffffff",
                  "description": null,
                  "id": "MDU6TGFiZWwxMzE5MzY2NDk="
                }
              }
            ]
          }
        },
        {
          "name": "leanix-sdk-python",
          "id": "MDEwOlJlcG9zaXRvcnkyNDYxMzUzMQ==",
          "nameWithOwner": "leanix/leanix-sdk-python",
          "description": null,
          "createdAt": "2014-09-29T21:20:19Z",
          "isArchived": true,
          "updatedAt": "2018-06-12T12:20:12Z",
          "languages": {
            "edges": [
              {
                "node": {
                  "name": "Scala",
                  "id": "MDg6TGFuZ3VhZ2UxNjk="
                }
              },
              {
                "node": {
                  "name": "Python",
                  "id": "MDg6TGFuZ3VhZ2UxNDU="
                }
              }
            ]
          },
          "labels": {
            "edges": [
              {
                "node": {
                  "name": "bug",
                  "color": "fc2929",
                  "description": null,
                  "id": "MDU6TGFiZWwxMzM1NTM0MjE="
                }
              },
              {
                "node": {
                  "name": "duplicate",
                  "color": "cccccc",
                  "description": null,
                  "id": "MDU6TGFiZWwxMzM1NTM0MjI="
                }
              },
              {
                "node": {
                  "name": "enhancement",
                  "color": "84b6eb",
                  "description": null,
                  "id": "MDU6TGFiZWwxMzM1NTM0MjM="
                }
              },
              {
                "node": {
                  "name": "help wanted",
                  "color": "159818",
                  "description": null,
                  "id": "MDU6TGFiZWwxMzM1NTM0MjQ="
                }
              },
              {
                "node": {
                  "name": "invalid",
                  "color": "e6e6e6",
                  "description": null,
                  "id": "MDU6TGFiZWwxMzM1NTM0MjU="
                }
              },
              {
                "node": {
                  "name": "question",
                  "color": "cc317c",
                  "description": null,
                  "id": "MDU6TGFiZWwxMzM1NTM0MjY="
                }
              },
              {
                "node": {
                  "name": "wontfix",
                  "color": "ffffff",
                  "description": null,
                  "id": "MDU6TGFiZWwxMzM1NTM0Mjc="
                }
              }
            ]
          }
        },
        {
          "name": "leanix-dropkit-example",
          "id": "MDEwOlJlcG9zaXRvcnkyNDc4ODUyNA==",
          "nameWithOwner": "leanix/leanix-dropkit-example",
          "description": "Example for Java micro service based on Dropwizard",
          "createdAt": "2014-10-04T12:12:36Z",
          "isArchived": false,
          "updatedAt": "2020-06-08T20:27:46Z",
          "languages": {
            "edges": [
              {
                "node": {
                  "name": "Shell",
                  "id": "MDg6TGFuZ3VhZ2UxMzk="
                }
              },
              {
                "node": {
                  "name": "Java",
                  "id": "MDg6TGFuZ3VhZ2UxNTg="
                }
              },
              {
                "node": {
                  "name": "FreeMarker",
                  "id": "MDg6TGFuZ3VhZ2U0ODY="
                }
              }
            ]
          },
          "labels": {
            "edges": [
              {
                "node": {
                  "name": "bug",
                  "color": "fc2929",
                  "description": null,
                  "id": "MDU6TGFiZWwxMzQ3ODg1OTM="
                }
              },
              {
                "node": {
                  "name": "duplicate",
                  "color": "cccccc",
                  "description": null,
                  "id": "MDU6TGFiZWwxMzQ3ODg1OTQ="
                }
              },
              {
                "node": {
                  "name": "enhancement",
                  "color": "84b6eb",
                  "description": null,
                  "id": "MDU6TGFiZWwxMzQ3ODg1OTU="
                }
              },
              {
                "node": {
                  "name": "help wanted",
                  "color": "159818",
                  "description": null,
                  "id": "MDU6TGFiZWwxMzQ3ODg1OTY="
                }
              },
              {
                "node": {
                  "name": "invalid",
                  "color": "e6e6e6",
                  "description": null,
                  "id": "MDU6TGFiZWwxMzQ3ODg1OTc="
                }
              },
              {
                "node": {
                  "name": "question",
                  "color": "cc317c",
                  "description": null,
                  "id": "MDU6TGFiZWwxMzQ3ODg1OTg="
                }
              },
              {
                "node": {
                  "name": "wontfix",
                  "color": "ffffff",
                  "description": null,
                  "id": "MDU6TGFiZWwxMzQ3ODg1OTk="
                }
              }
            ]
          }
        },
        {
          "name": "leanix-export",
          "id": "MDEwOlJlcG9zaXRvcnkyNDc4OTIxNw==",
          "nameWithOwner": "leanix/leanix-export",
          "description": null,
          "createdAt": "2014-10-04T12:52:28Z",
          "isArchived": false,
          "updatedAt": "2020-06-08T20:01:59Z",
          "languages": {
            "edges": [
              {
                "node": {
                  "name": "Shell",
                  "id": "MDg6TGFuZ3VhZ2UxMzk="
                }
              },
              {
                "node": {
                  "name": "Java",
                  "id": "MDg6TGFuZ3VhZ2UxNTg="
                }
              },
              {
                "node": {
                  "name": "JavaScript",
                  "id": "MDg6TGFuZ3VhZ2UxNDA="
                }
              },
              {
                "node": {
                  "name": "FreeMarker",
                  "id": "MDg6TGFuZ3VhZ2U0ODY="
                }
              },
              {
                "node": {
                  "name": "Dockerfile",
                  "id": "MDg6TGFuZ3VhZ2U1MzU="
                }
              }
            ]
          },
          "labels": {
            "edges": [
              {
                "node": {
                  "name": "do not merge",
                  "color": "ff8b87",
                  "description": "PR cannot be merged because it's unfinished or depending on another PR.",
                  "id": "MDU6TGFiZWwxNDg4ODE2NjI2"
                }
              },
              {
                "node": {
                  "name": "educational",
                  "color": "7fbce8",
                  "description": "PR contains references on how to implement a certain behaviour.",
                  "id": "MDU6TGFiZWwxNDg4ODE3MjEy"
                }
              },
              {
                "node": {
                  "name": "fix it day",
                  "color": "9ff9c3",
                  "description": "PR started during a Fix It Day. Should be merged on the same day or on the next day.",
                  "id": "MDU6TGFiZWwxNDg4ODE3Nzc0"
                }
              },
              {
                "node": {
                  "name": "obsolete",
                  "color": "d6f7a5",
                  "description": "PR is obsolete due to a story that won't be fixed or because there is a newer branch.",
                  "id": "MDU6TGFiZWwxNDg4ODE4MjMw"
                }
              },
              {
                "node": {
                  "name": "spike",
                  "color": "fced99",
                  "description": "PR contains a proof-of-concept or example implementation used within a spike story.",
                  "id": "MDU6TGFiZWwxNDg4ODE4Njc2"
                }
              }
            ]
          }
        },
        {
          "name": "leanix-dropkit",
          "id": "MDEwOlJlcG9zaXRvcnkyNTMwNTYwMg==",
          "nameWithOwner": "leanix/leanix-dropkit",
          "description": "The glue between java services",
          "createdAt": "2014-10-16T14:18:37Z",
          "isArchived": false,
          "updatedAt": "2020-07-24T12:33:54Z",
          "languages": {
            "edges": [
              {
                "node": {
                  "name": "Shell",
                  "id": "MDg6TGFuZ3VhZ2UxMzk="
                }
              },
              {
                "node": {
                  "name": "Java",
                  "id": "MDg6TGFuZ3VhZ2UxNTg="
                }
              }
            ]
          },
          "labels": {
            "edges": [
              {
                "node": {
                  "name": "bug",
                  "color": "fc2929",
                  "description": null,
                  "id": "MDU6TGFiZWwxMzg0Mjg5Mjk="
                }
              },
              {
                "node": {
                  "name": "duplicate",
                  "color": "cccccc",
                  "description": null,
                  "id": "MDU6TGFiZWwxMzg0Mjg5MzA="
                }
              },
              {
                "node": {
                  "name": "enhancement",
                  "color": "84b6eb",
                  "description": null,
                  "id": "MDU6TGFiZWwxMzg0Mjg5MzE="
                }
              },
              {
                "node": {
                  "name": "help wanted",
                  "color": "159818",
                  "description": null,
                  "id": "MDU6TGFiZWwxMzg0Mjg5MzI="
                }
              },
              {
                "node": {
                  "name": "invalid",
                  "color": "e6e6e6",
                  "description": null,
                  "id": "MDU6TGFiZWwxMzg0Mjg5MzM="
                }
              },
              {
                "node": {
                  "name": "question",
                  "color": "cc317c",
                  "description": null,
                  "id": "MDU6TGFiZWwxMzg0Mjg5MzQ="
                }
              },
              {
                "node": {
                  "name": "wontfix",
                  "color": "ffffff",
                  "description": null,
                  "id": "MDU6TGFiZWwxMzg0Mjg5MzU="
                }
              }
            ]
          }
        },
        {
          "name": "leanix-images",
          "id": "MDEwOlJlcG9zaXRvcnkyNjAwNzMyMw==",
          "nameWithOwner": "leanix/leanix-images",
          "description": "User avatar image service",
          "createdAt": "2014-10-31T08:00:35Z",
          "isArchived": false,
          "updatedAt": "2021-01-26T11:44:46Z",
          "languages": {
            "edges": [
              {
                "node": {
                  "name": "Shell",
                  "id": "MDg6TGFuZ3VhZ2UxMzk="
                }
              },
              {
                "node": {
                  "name": "Java",
                  "id": "MDg6TGFuZ3VhZ2UxNTg="
                }
              },
              {
                "node": {
                  "name": "FreeMarker",
                  "id": "MDg6TGFuZ3VhZ2U0ODY="
                }
              },
              {
                "node": {
                  "name": "Dockerfile",
                  "id": "MDg6TGFuZ3VhZ2U1MzU="
                }
              }
            ]
          },
          "labels": {
            "edges": [
              {
                "node": {
                  "name": "bug",
                  "color": "fc2929",
                  "description": null,
                  "id": "MDU6TGFiZWwxNDMzNzAxNDU="
                }
              },
              {
                "node": {
                  "name": "duplicate",
                  "color": "cccccc",
                  "description": null,
                  "id": "MDU6TGFiZWwxNDMzNzAxNDY="
                }
              },
              {
                "node": {
                  "name": "enhancement",
                  "color": "84b6eb",
                  "description": null,
                  "id": "MDU6TGFiZWwxNDMzNzAxNDc="
                }
              },
              {
                "node": {
                  "name": "help wanted",
                  "color": "159818",
                  "description": null,
                  "id": "MDU6TGFiZWwxNDMzNzAxNDg="
                }
              },
              {
                "node": {
                  "name": "invalid",
                  "color": "e6e6e6",
                  "description": null,
                  "id": "MDU6TGFiZWwxNDMzNzAxNDk="
                }
              },
              {
                "node": {
                  "name": "question",
                  "color": "cc317c",
                  "description": null,
                  "id": "MDU6TGFiZWwxNDMzNzAxNTA="
                }
              },
              {
                "node": {
                  "name": "wontfix",
                  "color": "ffffff",
                  "description": null,
                  "id": "MDU6TGFiZWwxNDMzNzAxNTE="
                }
              },
              {
                "node": {
                  "name": "WIP",
                  "color": "f7aab3",
                  "description": "work in progress",
                  "id": "MDU6TGFiZWwxMjc0ODM0Njg3"
                }
              },
              {
                "node": {
                  "name": "don't merge yet",
                  "color": "70bce5",
                  "description": "",
                  "id": "MDU6TGFiZWwxMjc0ODM1MjU5"
                }
              },
              {
                "node": {
                  "name": "team-invent",
                  "color": "fcff66",
                  "description": "",
                  "id": "MDU6TGFiZWwyNDYyMDg5MzEx"
                }
              }
            ]
          }
        },
        {
          "name": "leanix-dropkit-persistence",
          "id": "MDEwOlJlcG9zaXRvcnkyNjIxODY2MQ==",
          "nameWithOwner": "leanix/leanix-dropkit-persistence",
          "description": "Persistence related utilities",
          "createdAt": "2014-11-05T12:33:08Z",
          "isArchived": false,
          "updatedAt": "2020-08-27T11:07:14Z",
          "languages": {
            "edges": [
              {
                "node": {
                  "name": "Java",
                  "id": "MDg6TGFuZ3VhZ2UxNTg="
                }
              }
            ]
          },
          "labels": {
            "edges": [
              {
                "node": {
                  "name": "bug",
                  "color": "fc2929",
                  "description": null,
                  "id": "MDU6TGFiZWwxNDQ4NTkxMzk="
                }
              },
              {
                "node": {
                  "name": "duplicate",
                  "color": "cccccc",
                  "description": null,
                  "id": "MDU6TGFiZWwxNDQ4NTkxNDA="
                }
              },
              {
                "node": {
                  "name": "enhancement",
                  "color": "84b6eb",
                  "description": null,
                  "id": "MDU6TGFiZWwxNDQ4NTkxNDE="
                }
              },
              {
                "node": {
                  "name": "help wanted",
                  "color": "159818",
                  "description": null,
                  "id": "MDU6TGFiZWwxNDQ4NTkxNDI="
                }
              },
              {
                "node": {
                  "name": "invalid",
                  "color": "e6e6e6",
                  "description": null,
                  "id": "MDU6TGFiZWwxNDQ4NTkxNDM="
                }
              },
              {
                "node": {
                  "name": "question",
                  "color": "cc317c",
                  "description": null,
                  "id": "MDU6TGFiZWwxNDQ4NTkxNDQ="
                }
              },
              {
                "node": {
                  "name": "wontfix",
                  "color": "ffffff",
                  "description": null,
                  "id": "MDU6TGFiZWwxNDQ4NTkxNDU="
                }
              }
            ]
          }
        },
        {
          "name": "leanix-webhooks-sdk-java",
          "id": "MDEwOlJlcG9zaXRvcnkyNjIyODYxMA==",
          "nameWithOwner": "leanix/leanix-webhooks-sdk-java",
          "description": "Webhooks SDK",
          "createdAt": "2014-11-05T16:30:44Z",
          "isArchived": false,
          "updatedAt": "2020-12-21T15:16:14Z",
          "languages": {
            "edges": [
              {
                "node": {
                  "name": "HTML",
                  "id": "MDg6TGFuZ3VhZ2U0MTc="
                }
              },
              {
                "node": {
                  "name": "Java",
                  "id": "MDg6TGFuZ3VhZ2UxNTg="
                }
              }
            ]
          },
          "labels": {
            "edges": [
              {
                "node": {
                  "name": "bug",
                  "color": "fc2929",
                  "description": null,
                  "id": "MDU6TGFiZWwxNDQ5MjkzOTY="
                }
              },
              {
                "node": {
                  "name": "duplicate",
                  "color": "cccccc",
                  "description": null,
                  "id": "MDU6TGFiZWwxNDQ5MjkzOTc="
                }
              },
              {
                "node": {
                  "name": "enhancement",
                  "color": "84b6eb",
                  "description": null,
                  "id": "MDU6TGFiZWwxNDQ5MjkzOTg="
                }
              },
              {
                "node": {
                  "name": "help wanted",
                  "color": "159818",
                  "description": null,
                  "id": "MDU6TGFiZWwxNDQ5MjkzOTk="
                }
              },
              {
                "node": {
                  "name": "invalid",
                  "color": "e6e6e6",
                  "description": null,
                  "id": "MDU6TGFiZWwxNDQ5Mjk0MDA="
                }
              },
              {
                "node": {
                  "name": "question",
                  "color": "cc317c",
                  "description": null,
                  "id": "MDU6TGFiZWwxNDQ5Mjk0MDE="
                }
              },
              {
                "node": {
                  "name": "wontfix",
                  "color": "ffffff",
                  "description": null,
                  "id": "MDU6TGFiZWwxNDQ5Mjk0MDI="
                }
              }
            ]
          }
        },
        {
          "name": "leanix-webhooks",
          "id": "MDEwOlJlcG9zaXRvcnkyNjIyODc0Mg==",
          "nameWithOwner": "leanix/leanix-webhooks",
          "description": "Webhook service",
          "createdAt": "2014-11-05T16:34:18Z",
          "isArchived": false,
          "updatedAt": "2021-03-26T07:22:27Z",
          "languages": {
            "edges": [
              {
                "node": {
                  "name": "Shell",
                  "id": "MDg6TGFuZ3VhZ2UxMzk="
                }
              },
              {
                "node": {
                  "name": "Java",
                  "id": "MDg6TGFuZ3VhZ2UxNTg="
                }
              },
              {
                "node": {
                  "name": "FreeMarker",
                  "id": "MDg6TGFuZ3VhZ2U0ODY="
                }
              },
              {
                "node": {
                  "name": "Dockerfile",
                  "id": "MDg6TGFuZ3VhZ2U1MzU="
                }
              }
            ]
          },
          "labels": {
            "edges": [
              {
                "node": {
                  "name": "bug",
                  "color": "fc2929",
                  "description": null,
                  "id": "MDU6TGFiZWwxNDQ5MzAzMjY="
                }
              },
              {
                "node": {
                  "name": "duplicate",
                  "color": "cccccc",
                  "description": null,
                  "id": "MDU6TGFiZWwxNDQ5MzAzMjc="
                }
              },
              {
                "node": {
                  "name": "enhancement",
                  "color": "84b6eb",
                  "description": null,
                  "id": "MDU6TGFiZWwxNDQ5MzAzMjg="
                }
              },
              {
                "node": {
                  "name": "help wanted",
                  "color": "159818",
                  "description": null,
                  "id": "MDU6TGFiZWwxNDQ5MzAzMjk="
                }
              },
              {
                "node": {
                  "name": "invalid",
                  "color": "e6e6e6",
                  "description": null,
                  "id": "MDU6TGFiZWwxNDQ5MzAzMzA="
                }
              },
              {
                "node": {
                  "name": "question",
                  "color": "cc317c",
                  "description": null,
                  "id": "MDU6TGFiZWwxNDQ5MzAzMzE="
                }
              },
              {
                "node": {
                  "name": "wontfix",
                  "color": "ffffff",
                  "description": null,
                  "id": "MDU6TGFiZWwxNDQ5MzAzMzI="
                }
              },
              {
                "node": {
                  "name": "In Progress",
                  "color": "FFCD01",
                  "description": "",
                  "id": "MDU6TGFiZWw5OTE2ODIwOTk="
                }
              },
              {
                "node": {
                  "name": "do not merge yet",
                  "color": "e99695",
                  "description": "this PR has dependencies to other PRs",
                  "id": "MDU6TGFiZWwxMDg4Nzc3MDkz"
                }
              },
              {
                "node": {
                  "name": "Work in progress",
                  "color": "5405bc",
                  "description": "Not ready for review yet",
                  "id": "MDU6TGFiZWwxMzU1NTkzMTUw"
                }
              }
            ]
          }
        },
        {
          "name": "leanix-synclog-sdk-java",
          "id": "MDEwOlJlcG9zaXRvcnkyNjU5NjAyNA==",
          "nameWithOwner": "leanix/leanix-synclog-sdk-java",
          "description": "Java SDK for leanix-synclog",
          "createdAt": "2014-11-13T16:11:14Z",
          "isArchived": false,
          "updatedAt": "2020-12-21T15:02:49Z",
          "languages": {
            "edges": [
              {
                "node": {
                  "name": "Java",
                  "id": "MDg6TGFuZ3VhZ2UxNTg="
                }
              }
            ]
          },
          "labels": {
            "edges": [
              {
                "node": {
                  "name": "bug",
                  "color": "fc2929",
                  "description": null,
                  "id": "MDU6TGFiZWwxNDc1MTcyMzA="
                }
              },
              {
                "node": {
                  "name": "duplicate",
                  "color": "cccccc",
                  "description": null,
                  "id": "MDU6TGFiZWwxNDc1MTcyMzE="
                }
              },
              {
                "node": {
                  "name": "enhancement",
                  "color": "84b6eb",
                  "description": null,
                  "id": "MDU6TGFiZWwxNDc1MTcyMzI="
                }
              },
              {
                "node": {
                  "name": "help wanted",
                  "color": "159818",
                  "description": null,
                  "id": "MDU6TGFiZWwxNDc1MTcyMzM="
                }
              },
              {
                "node": {
                  "name": "invalid",
                  "color": "e6e6e6",
                  "description": null,
                  "id": "MDU6TGFiZWwxNDc1MTcyMzQ="
                }
              },
              {
                "node": {
                  "name": "question",
                  "color": "cc317c",
                  "description": null,
                  "id": "MDU6TGFiZWwxNDc1MTcyMzU="
                }
              },
              {
                "node": {
                  "name": "wontfix",
                  "color": "ffffff",
                  "description": null,
                  "id": "MDU6TGFiZWwxNDc1MTcyMzY="
                }
              }
            ]
          }
        }
      ]
    return data;
}