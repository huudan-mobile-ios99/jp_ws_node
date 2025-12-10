@echo off
echo Starting SERVER JPDESKTOP Nodes silently...

:: Start Server 1 (Info Server)
start "" /min cmd /c "cd /d C:\Users\thomas.dan\Desktop\JP_DESKTOP\jp_ws_node && npm start"

:: Start Server 2 (Hit Info Server)
start "" /min cmd /c "cd /d C:\Users\thomas.dan\Desktop\JP_DESKTOP\jp_server_hit_info_master && npm start server_get_hit.js"

exit
