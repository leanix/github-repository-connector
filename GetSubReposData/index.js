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
        "id": "MDEwOlJlcG9zaXRvcnkzNDkzNzY1MjM=",
        "name": "github-actions-store-leanix-plugin",
        "url": "https://github.com/leanix/github-actions-store-leanix-plugin",
        "languages": {
          "nodes": [
            {
              "id": "MDg6TGFuZ3VhZ2U1MzU=",
              "name": "Dockerfile"
            },
            {
              "id": "MDg6TGFuZ3VhZ2UxMzk=",
              "name": "Shell"
            },
            {
              "id": "MDg6TGFuZ3VhZ2UxNDA=",
              "name": "JavaScript"
            }
          ]
        },
        "repositoryTopics": {
          "nodes": []
        }
      },
      {
        "id": "MDEwOlJlcG9zaXRvcnk0ODEwMDExMQ==",
        "name": "leanix-custom-reports",
        "url": "https://github.com/leanix/leanix-custom-reports",
        "languages": {
          "nodes": [
            {
              "id": "MDg6TGFuZ3VhZ2UxNDA=",
              "name": "JavaScript"
            },
            {
              "id": "MDg6TGFuZ3VhZ2U0MTc=",
              "name": "HTML"
            },
            {
              "id": "MDg6TGFuZ3VhZ2UxMzk=",
              "name": "Shell"
            },
            {
              "id": "MDg6TGFuZ3VhZ2UzMDg=",
              "name": "CSS"
            }
          ]
        },
        "repositoryTopics": {
          "nodes": [
            {
              "topic": {
                "id": "MDU6VG9waWNpbnRlbGxlY3R1YWwtcHJvcGVydHktb2YtbGVhbml4",
                "name": "intellectual-property-of-leanix"
              }
            }
          ]
        }
      },
      {
        "id": "MDEwOlJlcG9zaXRvcnk0ODEwMDMwMQ==",
        "name": "leanix-app-launchpad",
        "url": "https://github.com/leanix/leanix-app-launchpad",
        "languages": {
          "nodes": [
            {
              "id": "MDg6TGFuZ3VhZ2U0MTc=",
              "name": "HTML"
            },
            {
              "id": "MDg6TGFuZ3VhZ2UxNDA=",
              "name": "JavaScript"
            },
            {
              "id": "MDg6TGFuZ3VhZ2UzMDg=",
              "name": "CSS"
            },
            {
              "id": "MDg6TGFuZ3VhZ2UxMzk=",
              "name": "Shell"
            },
            {
              "id": "MDg6TGFuZ3VhZ2U1MzU=",
              "name": "Dockerfile"
            }
          ]
        },
        "repositoryTopics": {
          "nodes": [
            {
              "topic": {
                "id": "MDU6VG9waWNpbnRlbGxlY3R1YWwtcHJvcGVydHktb2YtbGVhbml4",
                "name": "intellectual-property-of-leanix"
              }
            }
          ]
        }
      },
      {
        "id": "MDEwOlJlcG9zaXRvcnk1NjY5Mjk4MQ==",
        "name": "leanix-integrations",
        "url": "https://github.com/leanix/leanix-integrations",
        "languages": {
          "nodes": [
            {
              "id": "MDg6TGFuZ3VhZ2UxMzk=",
              "name": "Shell"
            },
            {
              "id": "MDg6TGFuZ3VhZ2UxNTg=",
              "name": "Java"
            },
            {
              "id": "MDg6TGFuZ3VhZ2U0ODY=",
              "name": "FreeMarker"
            },
            {
              "id": "MDg6TGFuZ3VhZ2U1MzU=",
              "name": "Dockerfile"
            }
          ]
        },
        "repositoryTopics": {
          "nodes": [
            {
              "topic": {
                "id": "MDU6VG9waWNpbnRlbGxlY3R1YWwtcHJvcGVydHktb2YtbGVhbml4",
                "name": "intellectual-property-of-leanix"
              }
            },
            {
              "topic": {
                "id": "MDU6VG9waWN0ZWFtLXNhaWxvcnM=",
                "name": "team-sailors"
              }
            }
          ]
        }
      },
      {
        "id": "MDEwOlJlcG9zaXRvcnk2MDE4OTU3OA==",
        "name": "leanix-integration-sap",
        "url": "https://github.com/leanix/leanix-integration-sap",
        "languages": {
          "nodes": [
            {
              "id": "MDg6TGFuZ3VhZ2UxNTg=",
              "name": "Java"
            }
          ]
        },
        "repositoryTopics": {
          "nodes": [
            {
              "topic": {
                "id": "MDU6VG9waWNpbnRlbGxlY3R1YWwtcHJvcGVydHktb2YtbGVhbml4",
                "name": "intellectual-property-of-leanix"
              }
            }
          ]
        }
      },
      {
        "id": "MDEwOlJlcG9zaXRvcnk4MzMzOTUyMg==",
        "name": "leanix-opportunity",
        "url": "https://github.com/leanix/leanix-opportunity",
        "languages": {
          "nodes": [
            {
              "id": "MDg6TGFuZ3VhZ2UxMzk=",
              "name": "Shell"
            },
            {
              "id": "MDg6TGFuZ3VhZ2UxNTg=",
              "name": "Java"
            },
            {
              "id": "MDg6TGFuZ3VhZ2U0ODY=",
              "name": "FreeMarker"
            },
            {
              "id": "MDg6TGFuZ3VhZ2U1MzU=",
              "name": "Dockerfile"
            },
            {
              "id": "MDg6TGFuZ3VhZ2U0MTc=",
              "name": "HTML"
            }
          ]
        },
        "repositoryTopics": {
          "nodes": [
            {
              "topic": {
                "id": "MDU6VG9waWNpbnRlbGxlY3R1YWwtcHJvcGVydHktb2YtbGVhbml4",
                "name": "intellectual-property-of-leanix"
              }
            },
            {
              "topic": {
                "id": "MDU6VG9waWN0ZWFtLXNlbnNl",
                "name": "team-sense"
              }
            }
          ]
        }
      },
      {
        "id": "MDEwOlJlcG9zaXRvcnkxMjM4MTc4NTQ=",
        "name": "product",
        "url": "https://github.com/leanix/product",
        "languages": {
          "nodes": []
        },
        "repositoryTopics": {
          "nodes": []
        }
      },
      {
        "id": "MDEwOlJlcG9zaXRvcnkxMTk1MjM1MTA=",
        "name": "postmortems",
        "url": "https://github.com/leanix/postmortems",
        "languages": {
          "nodes": []
        },
        "repositoryTopics": {
          "nodes": []
        }
      },
      {
        "id": "MDEwOlJlcG9zaXRvcnkzMDgyNTMyMg==",
        "name": "guidelines",
        "url": "https://github.com/leanix/guidelines",
        "languages": {
          "nodes": [
            {
              "id": "MDg6TGFuZ3VhZ2UzMDg=",
              "name": "CSS"
            },
            {
              "id": "MDg6TGFuZ3VhZ2UxMzk=",
              "name": "Shell"
            }
          ]
        },
        "repositoryTopics": {
          "nodes": []
        }
      }
    ]
    return data;
}