import subprocess

def main():
    result = subprocess.run(["docker", "logs", "fitness-tracker-backend-1"], capture_output=True, text=True)
    with open("backend_logs.txt", "w", encoding="utf-8") as f:
        f.write(result.stdout)
        f.write("\n")
        f.write(result.stderr)

if __name__ == '__main__':
    main()
