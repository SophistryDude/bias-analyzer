const encoded = "CBMixAFBVV95cUxOcVpQN3ZKTThRVU4xaW83SXE1YjBTSW9KTVVUbW5XZmRzTnE4YkRVTDJlODNqalY0Y2M5ckZQcUhEeTRjMlRiYkdvYzk0SnZONmExTmt3RkhjdnRfOUZWYl9QR0syQTBNS0ZMUi1hbWlld2dwMFZ6aFJmN216SlRnbHY4OTdjYVRJYW5wWjlDcUR3VDVXTmY4MjNPZTRBTmdsb1NzcjVHOFB5R1JaUmV5LWtYSzRuRTV2VnFyN3VrT1pHdkxG";
const decoded = Buffer.from(encoded, "base64");
console.log("Decoded bytes:", decoded.length);
console.log("Printable:", decoded.toString("utf-8").replace(/[^\x20-\x7E]/g, "·"));
// Look for URL patterns
const str = decoded.toString("latin1");
const urls = str.match(/https?:\/\/[^\x00-\x1f\x80-\xff]+/g);
console.log("URLs found:", urls);
