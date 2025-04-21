# Status Directory

This directory is used to store the status.json file which is shared between the shopping-bot container and the nginx container.

The status.json file contains information about:
- Bot status
- Product availability
- Notifications
- Last check time

This directory is mounted as a shared Docker volume named `shopping-bot_status` to allow both containers to access the file.
