// Function to decrypt AES-256-ECB with MD5
function aes256Decrypt(ciphertextWordArray) {
    const keyAscii = localStorage.getItem("current_flag");
    const md5Hex = CryptoJS.MD5(keyAscii).toString(CryptoJS.enc.Hex);
    const doubledHex = md5Hex + md5Hex;
    const key = CryptoJS.enc.Hex.parse(doubledHex);
    const decrypted = CryptoJS.AES.decrypt(
        { ciphertext: ciphertextWordArray },
        key,
        { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 }
    );
    return decrypted.toString(CryptoJS.enc.Latin1);
}

async function downloadFile(fileKey) {
    // Fetch encrypted file
    const cData = await loadChallenges();
    const challenge = cData.challenges[
        parseInt(localStorage.getItem("current_challenge"), 10) - 1];
    const fileObj = challenge.files.find(f => f.hash === fileKey);
    const response = await fetch(`challengeFiles/${fileObj.hash}.locked`);
    if (!response.ok) {
        throw new Error(`Failed to fetch file: challengeFiles/${fileObj.hash}.locked`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const wordArray = CryptoJS.lib.WordArray.create(new Uint8Array(arrayBuffer));
    // Decrypt
    const plaintext = aes256Decrypt(wordArray);
    // Download as file
    const byteArray = new Uint8Array([...plaintext].map(c => c.charCodeAt(0)));
    const blob = new Blob([byteArray], { type: "application/octet-stream" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = fileObj.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}

// Function to hash data using SHA-256
async function sha256Hash(data) {
    const encodedData = new TextEncoder().encode(data);
    const hashBuffer = await crypto.subtle.digest("SHA-256", encodedData);
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
}

// Function to parse a challenge file
async function processMdFile(filePath) {
    try {
        // Fetch the file content
        const response = await fetch("challenges/" + filePath + ".locked");
        if (!response.ok) {
            throw new Error(`Failed to fetch file: ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const wordArray = CryptoJS.lib.WordArray.create(new Uint8Array(arrayBuffer));

        decryptedText = aes256Decrypt(wordArray);
        
        const processedContent = decryptedText
            .split("\n")
            .join("\n");

        document.querySelector(".main-content").innerHTML += processedContent;
    } catch (error) {
        throw new Error(`Error processing challenge file:${error}`);
    }
}

// Process and load innerHTML
async function processChallenge(c) {
    const data = await loadChallenges();
    const challenge = data.challenges[parseInt(c, 10) - 1];
    var main_content = document.querySelector(".main-content");
    if (localStorage.getItem("current_challenge") <= parseInt(data.total)){
        main_content.innerHTML = `Current Challenge: ${localStorage.getItem("current_challenge")}/${data.total} - ${challenge.title}<br><br>`;
    } else {
        main_content.innerHTML = `Current Challenge: ${challenge.title}<br><br>`;
    }
    await processMdFile(challenge.hash);
}

// Load challenges JSON
async function loadChallenges() {
    try {
        const response = await fetch("challenges.json");
        if (!response.ok) {
            throw new Error(`Failed to load JSON: ${response.statusText}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        throw new Error(`Failed to load JSON. Please refresh!`);
    }
}

// DOMCL event listener
document.addEventListener("DOMContentLoaded", async () => {
    var currentChallenge = localStorage.getItem("current_challenge");
    var main_content = document.querySelector(".main-content");
    if (currentChallenge == null) {
        const text = `
            Welcome to Aydon's CTF Challenges!<br><br>
            Embark on a journey of cryptography, reverse engineering, 
            and more! This linear set of challenges will test your skills 
            as you capture each flag to unlock the next challenge.<br><br>
            The challenges vary in difficulty, from beginner-friendly to 
            advanced, and span a wide range of topics inspired by the 
            Virginia Cyber Range. While web challenges are limited due to 
            the static nature of GitHub Pages, there is still plenty to explore.<br><br>
            You can restart at any time be erasing cookies. Some
            challenges include files. All SHA-256 Hashes are available in each challenge.<br><br>
            Encounter a bug or want to add your own challenge? 
            Send an email to 'aydons.ctf.help@gmail.com'.<br><br>
            Remember to have fun, challenge yourself, and stay ethical. Good luck!<br><br>
            <button class="start-button">Start</button>
        `;
        main_content.innerHTML = text;
        document.querySelector(".start-button").addEventListener("click", () => {
            localStorage.setItem("current_challenge", "1");
            localStorage.setItem("current_flag", "start");
            location.reload();
        });
        return;
    } else {
        const cData = await loadChallenges();
        const challenge = cData.challenges[parseInt(currentChallenge, 10) - 1];
        if(parseInt(currentChallenge) <= cData.total) main_content.style.textAlign = "left";
        if (cData.total == "0") {
            main_content.innerHTML += "No challenges available at the moment. Please check back later.";
            return;
        } else await processChallenge(currentChallenge);
        if(parseInt(currentChallenge) <= cData.total) { 
            main_content.style.textAlign = "left";
            if (challenge.files && challenge.files.length > 0) {
                let tableHTML = `<div class="challenge-files"><table>`;
                challenge.files.forEach(file => {
                    tableHTML += `<tr>
                        <td class="filename-col">${file.filename}</td>
                        <td class="hash-col" title="Click to copy MD5 hash" data-hash="${file.hash}">Hash</td>
                        <td class="download-col"><button onclick="downloadFile('${file.hash}')">Download</button></td>
                    </tr>`;
                });
                tableHTML += `</table></div>`;
                main_content.innerHTML += tableHTML;
                setTimeout(() => {
                    document.querySelectorAll('.hash-col').forEach(cell => {
                        cell.addEventListener('click', function() {
                        const hash = this.getAttribute('data-hash');
                        if (hash) {
                            navigator.clipboard.writeText(hash);
                            this.title = "Copied!";
                            setTimeout(() => { this.title = "Click to copy MD5 hash"; }, 1000);
                        }
                        });
                    });
                }, 0);
            }
            main_content.innerHTML += `<div class="flag-box"><input class="text-box" type="text" 
                placeholder="Enter flag here"><button class="submit">Submit</button></div>
                <div class="flag-message"></div>`;
            
            document.querySelector(".submit").addEventListener("click", async () => {
                var text = document.querySelector('input').value.replace(/^flag\{(.+)\}$/, "$1");
                var sha256 = await sha256Hash(text);
                const msg = document.querySelector('.flag-message');

                if (sha256 == challenge.hash) {
                    localStorage.setItem("current_challenge", (parseInt(currentChallenge) + 1).toString());
                    localStorage.setItem("current_flag", text);
                    msg.innerHTML = `<b>Correct! Will reload in 3 seconds.</b>`;
                    setTimeout(() => { location.reload(); }, 3000);
                } else {
                    msg.innerHTML = `<b>Incorrect flag.</b>`;
                }
            });

            document.querySelector('input').addEventListener('keydown', async function(event) {
                if (event.key === 'Enter') {
                    var text = document.querySelector('input').value.replace(/^flag\{(.+)\}$/, "$1");
                    var sha256 = await sha256Hash(text);
                    const msg = document.querySelector('.flag-message');

                    if (sha256 == challenge.hash) {
                        localStorage.setItem("current_challenge", (parseInt(currentChallenge) + 1).toString());
                        localStorage.setItem("current_flag", text);
                        msg.innerHTML = `<b>Correct! Will reload in 3 seconds.</b>`;
                        setTimeout(() => { location.reload(); }, 3000);
                    } else {
                        msg.innerHTML = `<b>Incorrect flag.</b>`;
                    }
                }
            });
        } else main_content.style.textAlign = "center";
    }
});