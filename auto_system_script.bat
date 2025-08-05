@echo off
echo Starting System Information Collection...
echo.

:: Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Python is not installed or not in PATH
    echo Please install Python from https://python.org
    pause
    exit /b 1
)

:: Check if psutil is installed, install if not
echo Checking dependencies...
python -c "import psutil" >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing required dependencies...
    pip install psutil
)

:: Create the Python script inline
echo Creating system information script...
(
echo import platform
echo import psutil
echo import datetime
echo import socket
echo import os
echo import json
echo import logging
echo import time
echo.
echo # Configure logging
echo logging.basicConfig(level=logging.INFO, format='%%^(asctime^)s - %%^(levelname^)s - %%^(message^)s'^)
echo.
echo def get_system_info():
echo     """Gather comprehensive system information"""
echo     info_dict = {
echo         'timestamp': datetime.datetime.now().isoformat(),
echo         'system': {},
echo         'cpu': {},
echo         'memory': {},
echo         'disk': {},
echo         'network': {},
echo         'processes': {}
echo     }
echo     
echo     try:
echo         # Operating System Information
echo         info_dict['system'] = {
echo             'system': platform.system(),
echo             'node_name': platform.node(),
echo             'release': platform.release(),
echo             'version': platform.version(),
echo             'machine': platform.machine(),
echo             'processor': platform.processor(),
echo             'architecture': platform.architecture(),
echo             'python_version': platform.python_version()
echo         }
echo         
echo         # CPU Information
echo         try:
echo             cpu_freq = psutil.cpu_freq()
echo             max_freq = cpu_freq.max if cpu_freq and hasattr(cpu_freq, 'max'^) else 'N/A'
echo             current_freq = cpu_freq.current if cpu_freq and hasattr(cpu_freq, 'current'^) else 'N/A'
echo         except (AttributeError, OSError^):
echo             max_freq = 'N/A'
echo             current_freq = 'N/A'
echo             
echo         info_dict['cpu'] = {
echo             'physical_cores': psutil.cpu_count(logical=False^),
echo             'total_cores': psutil.cpu_count(logical=True^),
echo             'max_frequency': max_freq,
echo             'current_frequency': current_freq,
echo             'cpu_usage_percent': psutil.cpu_percent(interval=1^),
echo             'cpu_usage_per_core': psutil.cpu_percent(interval=1, percpu=True^)
echo         }
echo         
echo         # Memory Information
echo         memory = psutil.virtual_memory()
echo         swap = psutil.swap_memory()
echo         
echo         info_dict['memory'] = {
echo             'total': memory.total,
echo             'available': memory.available,
echo             'percent_used': memory.percent,
echo             'used': memory.used,
echo             'free': memory.free,
echo             'swap_total': swap.total,
echo             'swap_used': swap.used,
echo             'swap_free': swap.free,
echo             'swap_percent': swap.percent
echo         }
echo         
echo         # Network Information
echo         try:
echo             hostname = socket.gethostname()
echo             local_ip = socket.gethostbyname(hostname^)
echo             info_dict['network'] = {
echo                 'hostname': hostname,
echo                 'local_ip': local_ip
echo             }
echo         except Exception as e:
echo             info_dict['network'] = {'error': str(e^)}
echo         
echo         return info_dict
echo         
echo     except Exception as e:
echo         return {'error': str(e^), 'timestamp': datetime.datetime.now().isoformat()}
echo.
echo def print_system_info(info_dict^):
echo     """Print system information in a formatted way"""
echo     print("\n" + "="*50^)
echo     print("    SYSTEM INFORMATION REPORT"^)
echo     print("="*50^)
echo     
echo     if 'error' in info_dict:
echo         print(f"❌ Error: {info_dict['error']}"^)
echo         return
echo     
echo     # System Information
echo     system = info_dict.get('system', {}^)
echo     print(f"\n💻 System: {system.get('system', 'Unknown'^)}"^)
echo     print(f"🏷️  Hostname: {system.get('node_name', 'Unknown'^)}"^)
echo     print(f"📦 OS Version: {system.get('release', 'Unknown'^)}"^)
echo     print(f"🏗️  Architecture: {system.get('machine', 'Unknown'^)}"^)
echo     print(f"🐍 Python Version: {system.get('python_version', 'Unknown'^)}"^)
echo     
echo     # CPU Information
echo     cpu = info_dict.get('cpu', {}^)
echo     print(f"\n🔧 CPU Cores: {cpu.get('total_cores', 'Unknown'^)}"^)
echo     print(f"⚡ CPU Usage: {cpu.get('cpu_usage_percent', 'Unknown'^)}%%"^)
echo     
echo     # Memory Information
echo     memory = info_dict.get('memory', {}^)
echo     total_gb = round(memory.get('total', 0^) / (1024**3^), 2^)
echo     used_gb = round(memory.get('used', 0^) / (1024**3^), 2^)
echo     print(f"\n💾 Total Memory: {total_gb} GB"^)
echo     print(f"📊 Used Memory: {used_gb} GB ({memory.get('percent_used', 0^)}%%^)"^)
echo     
echo     # Network Information
echo     network = info_dict.get('network', {}^)
echo     print(f"\n🌐 Hostname: {network.get('hostname', 'Unknown'^)}"^)
echo     print(f"🔗 Local IP: {network.get('local_ip', 'Unknown'^)}"^)
echo.
echo def save_data(info_dict^):
echo     """Save system information to JSON file"""
echo     try:
echo         filename = f"system_info_{datetime.datetime.now().strftime('%%Y%%m%%d_%%H%%M%%S'^)}.json"
echo         with open(filename, 'w'^) as f:
echo             json.dump(info_dict, f, indent=2, default=str^)
echo         print(f"\n📁 Data saved to: {filename}"^)
echo     except Exception as e:
echo         print(f"❌ Error saving data: {e}"^)
echo.
echo def main():
echo     """Main execution function"""
echo     print("🚀 Starting automatic system information gathering..."^)
echo     print("⏳ Please wait while collecting data..."^)
echo     
echo     try:
echo         info = get_system_info()
echo         print_system_info(info^)
echo         save_data(info^)
echo         print("\n✅ System analysis completed successfully!"^)
echo         
echo         # Send data to server if possible
echo         try:
echo             import urllib.request
echo             import urllib.parse
echo             
echo             data = urllib.parse.urlencode({'systemData': json.dumps(info^)}^).encode()
echo             req = urllib.request.Request('http://localhost:3000/api/data', data=data^)
echo             req.add_header('Content-Type', 'application/x-www-form-urlencoded'^)
echo             response = urllib.request.urlopen(req^)
echo             print("📡 Data sent to monitoring dashboard"^)
echo         except:
echo             print("📡 Could not send data to dashboard (server may be offline^)"^)
echo             
echo     except KeyboardInterrupt:
echo         print("\n⚠️  Process interrupted by user."^)
echo     except Exception as e:
echo         print(f"\n❌ Unexpected error: {e}"^)
echo     
echo     input("\nPress Enter to exit..."^)
echo.
echo if __name__ == "__main__":
echo     main()
) > temp_system_script.py

:: Execute the Python script
echo.
echo Executing system information collection...
python temp_system_script.py

:: Clean up
del temp_system_script.py

echo.
echo Script execution completed.
pause