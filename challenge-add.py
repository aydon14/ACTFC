import json
import os
import hashlib
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import padding

CHALLENGES_FILE = "challenges.json"

def load_challenges():
    if not os.path.exists(CHALLENGES_FILE):
        return {"total": 1, "challenges": []}
    with open(CHALLENGES_FILE, "r") as file:
        return json.load(file)

def save_challenges(challenges):
    with open(CHALLENGES_FILE, "w") as file:
        json.dump(challenges, file, indent=4)

def sha(data):
    if isinstance(data, str):
        data = data.encode()
    return hashlib.sha256(data).hexdigest()

def make_aes_key_from_string(input_str: str) -> bytes:
    md5_hex = hashlib.md5(input_str.encode()).hexdigest()
    doubled_hex = md5_hex + md5_hex
    return bytes.fromhex(doubled_hex)

def aes_ecb_encrypt_file(key: bytes, file_data: bytes) -> bytes:
    padder = padding.PKCS7(128).padder()
    padded_data = padder.update(file_data) + padder.finalize()

    cipher = Cipher(algorithms.AES(key), modes.ECB(), backend=default_backend())
    encryptor = cipher.encryptor()
    ciphertext = encryptor.update(padded_data) + encryptor.finalize()
    
    return ciphertext

def main():
    # NOTE:
    # This program should be ran in the repository 
    # of ACTFC in order for challenge files to be 
    # placed in the correct folders.
    
    # Since challenges are linear, run this 
    # program in the order that you want your 
    # challenges presented to the user.
    """
    This is the only section you need to change.
    """
    challenges = load_challenges()
    challenge_title = "Sample 1"
    # Your challenge data becomes HTML, therefore use '<br><br>' for line seperation.
    challenge_data = "This is an example challenge.<br><br>Here is an example flag: flag{sample}<br><br>The file attached also contains that flag."
    # Attached files should be in this repository, 
    # or else the names of your attached files will 
    # include the full file path.
    challenge_files = ["flag.txt"]
    challenge_flag = "start" # flag of the PREVIOUS challenge
    new_flag = "sample" # flag of THIS challenge
    # The finale is placed after your new challenge.
    finale = "You can fill this part in with your finale, or your ending when you finish all challenges."
    """
    End of section you need to change.
    """    
    aes_key = make_aes_key_from_string(challenge_flag)
    newKey = make_aes_key_from_string(new_flag)
    
    if (os.path.exists("challenges/ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff.locked")):
        os.remove("challenges/ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff.locked")

    challenges["challenges"] = [
        challenge for challenge in challenges["challenges"]
        if challenge["title"] != "Finale"
    ]

    challenges["total"] = challenges["total"] + 1
    new_challenge = {
        "title": challenge_title,
        "hash": sha(new_flag)
    }

    with open(f"challenges/{sha(new_flag)}.locked", "wb") as file:
        file.write(aes_ecb_encrypt_file(aes_key, challenge_data.encode()))

    if challenge_files:
        new_challenge["files"] = []
        for file_path in challenge_files:
            with open(file_path, "rb") as file:
                file_data = file.read()
            new_challenge["files"].append({
                "filename": file_path,
                "hash": sha(file_data)
            })
            with open(f"challengeFiles/{sha(file_data)}.locked", "wb") as file:
                file.write(aes_ecb_encrypt_file(aes_key, file_data))

    challenges["challenges"].append(new_challenge)
    challenges["challenges"].append({
        "title": "Finale",
        "hash": "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
    })
    save_challenges(challenges)
    
    with open("challenges/ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff.locked", "wb") as file:
        file.write(aes_ecb_encrypt_file(newKey, finale.encode()))
        
    print(f"Challenge '{challenge_title}' added successfully!")

if __name__ == "__main__":
    main()