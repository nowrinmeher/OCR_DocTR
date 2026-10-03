import os
import sys
import getpass
from huggingface_hub import HfApi, login

def deploy():
    print("=" * 70)
    print("🚀 DocTR AI OCR Studio - Direct Hugging Face Spaces Deployer")
    print("=" * 70)
    
    # 1. Get Token
    token = os.environ.get("HF_TOKEN")
    if not token:
        print("\n🔑 Please enter your Hugging Face Access Token (with 'Write' permission).")
        print("   (Get one from: https://huggingface.co/settings/tokens)")
        token = input("HF Access Token: ").strip()
        
    if not token:
        print("❌ Error: Hugging Face Token is required.")
        return

    print("\n⏳ Authenticating with Hugging Face...")
    try:
        login(token=token, add_to_git_credential=False)
        api = HfApi(token=token)
        user_info = api.whoami()
        username = user_info["name"]
        print(f"✅ Authenticated successfully as: @{username}")
    except Exception as e:
        print(f"❌ Authentication failed: {e}")
        return

    # 2. Space Name
    default_space_name = f"{username}/doctr-ocr-studio"
    print(f"\n📦 Target Space repository: [default: {default_space_name}]")
    custom_name = input("Press Enter to use default or type custom name: ").strip()
    repo_id = custom_name if custom_name else default_space_name
    
    if "/" not in repo_id:
        repo_id = f"{username}/{repo_id}"

    # 3. Create Space if it doesn't exist
    print(f"\n🚀 Setting up Space '{repo_id}' on Hugging Face...")
    try:
        api.create_repo(
            repo_id=repo_id,
            repo_type="space",
            space_sdk="docker",
            private=False,
            exist_ok=True
        )
        print("✅ Space repository ready.")
    except Exception as e:
        print(f"⚠️ Note on Space creation: {e}")

    # 4. Upload Files
    local_dir = os.path.dirname(os.path.abspath(__file__))
    print(f"\n📤 Uploading project files and model weights from:\n   {local_dir}")
    print("   This may take 1-3 minutes depending on your internet connection...")
    
    ignore_patterns = [
        "*.pyc",
        "__pycache__",
        ".git*",
        "*.log",
        ".venv*",
        "env*",
        "venv*"
    ]
    
    try:
        api.upload_folder(
            folder_path=local_dir,
            repo_id=repo_id,
            repo_type="space",
            ignore_patterns=ignore_patterns,
            commit_message="Deploy DocTR AI OCR Studio with custom weights"
        )
        print("\n" + "=" * 70)
        print("🎉 DEPLOYMENT COMPLETE!")
        print(f"🌐 Your Space is live at:")
        print(f"   https://huggingface.co/spaces/{repo_id}")
        print("=" * 70)
    except Exception as e:
        print(f"❌ Upload failed: {e}")

if __name__ == "__main__":
    deploy()
