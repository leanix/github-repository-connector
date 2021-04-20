/*
 * This function is not intended to be invoked directly. Instead it will be
 * triggered by an orchestrator function.
 * 
 */

module.exports = async function (context, partialResults) {
    const combinedResults = partialResults.flatMap(partial => partial);
    let existingLanguagesIds = []
    let existingLabelsIds = []
    // const data1 = getReposData(repoIds).map(convertToLdif(existingLanguagesIds, existingLabelsIds));
    let data = []
    let partialData = []
    let existingLanguagesIds2 = []
    let existingLabelsIds2 = []
    // const reposData = getReposData(repoIds)
    combinedResults.map(repoData => {
        [partialData, existingLanguagesIds2, existingLabelsIds2] = convertToLdif(repoData, existingLanguagesIds, existingLabelsIds)
        existingLanguagesIds = existingLanguagesIds2
        existingLabelsIds = existingLabelsIds2
        data = [data, ...partialData]
    })
    // save to required azure storage

    // send sas url
    return `sas-url`;
};

function convertToLdif(repoData, existingLanguagesIds, existingLabelsIds) {
    const ldif = {
        type: "Repository",
        id: repoData.id,
        data: {
            name: repoData.name,
            description: repoData.description,
            createdAt: repoData.createdAt,
            languages: repoData.languages && repoData.languages.edges.map(({node})=>
                node.id
            ),
            labels: repoData.labels && repoData.labels.edges.map(({node})=>
                node.id
            )
        }
    }
    langLdifs = repoData.languages && repoData.languages.edges.filter(({node})=> !existingLanguagesIds.includes(node.id)).map(({node}) => {
            existingLanguagesIds.push(node.id)
            return {
                type: 'Language',
                id: node.id,
                data: {
                    name: node.name
                }
            }
    })
    labelLdifs = repoData.labels && repoData.labels.edges.filter(({node})=> !existingLabelsIds.includes(node.id)).map(({node}) => {
            existingLabelsIds.push(node.id)
            return {
                type: 'Label',
                id: node.id,
                data: {
                    name: node.name,
                    color: node.color,
                    description: node.description
                }
            }
    })
    console.log("LINE 2070, LDIF for REPO is ", ldif)
    console.log("LINE 2071, LDIF for LANG is ", langLdifs)
    console.log("LINE 2072, LDIF for LABEL is ", labelLdifs)
    return [[ldif, ...langLdifs, ...labelLdifs], existingLanguagesIds, existingLabelsIds];
}
