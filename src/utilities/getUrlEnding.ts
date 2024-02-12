export function getUrlEnding(url: string): string {
    let urlSplit: string[] = url.split('/'); //url = ["serverName","app",...,"bb65efd50ade4b3591dcf7f4c693042b"]
    if (urlSplit[urlSplit.length - 1] === '') { //if the last element is empty, then the url ends with a '/'
        urlSplit.pop(); //remove the last element
    }
    if (urlSplit.length === 0) { //if the url is empty, return an empty string
        return '';
    }
    return urlSplit[urlSplit.length - 1];
}