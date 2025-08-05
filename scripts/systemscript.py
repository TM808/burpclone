import platform
import psutil
import datetime
import socket
import os
import json
import logging
import time

# Configure logging for research purposes
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def get_system_info():
    """Gather comprehensive system information for cybersecurity research"""
    info_dict = {
        'timestamp': datetime.datetime.now().isoformat(),
        'system': {},
        'cpu': {},
        'memory': {},
        'disk': {},
        'network': {},
        'processes': {}
    }
    
    try:
        # Operating System Information
        info_dict['system'] = {
            'system': platform.system(),
            'node_name': platform.node(),
            'release': platform.release(),
            'version': platform.version(),
            'machine': platform.machine(),
            'processor': platform.processor(),
            'architecture': platform.architecture(),
            'python_version': platform.python_version()
        }
        
        # CPU Information - Fixed potential None error
        try:
            cpu_freq = psutil.cpu_freq()
            max_freq = cpu_freq.max if cpu_freq and hasattr(cpu_freq, 'max') else 'N/A'
            current_freq = cpu_freq.current if cpu_freq and hasattr(cpu_freq, 'current') else 'N/A'
        except (AttributeError, OSError):
            max_freq = 'N/A'
            current_freq = 'N/A'
            
        info_dict['cpu'] = {
            'physical_cores': psutil.cpu_count(logical=False),
            'total_cores': psutil.cpu_count(logical=True),
            'max_frequency': max_freq,
            'current_frequency': current_freq,
            'cpu_usage_percent': psutil.cpu_percent(interval=1),
            'cpu_usage_per_core': psutil.cpu_percent(interval=1, percpu=True)
        }
        
        # Memory Information
        memory = psutil.virtual_memory()
        swap = psutil.swap_memory()
        
        info_dict['memory'] = {
            'total': memory.total,
            'available': memory.available,
            'percent_used': memory.percent,
            'used': memory.used,
            'free': memory.free,
            'swap_total': swap.total,
            'swap_used': swap.used,
            'swap_free': swap.free,
            'swap_percent': swap.percent
        }
        
        # Disk Information
        disk_info = {}
        partitions = psutil.disk_partitions()
        for partition in partitions:
            try:
                partition_usage = psutil.disk_usage(partition.mountpoint)
                disk_info[partition.device] = {
                    'mountpoint': partition.mountpoint,
                    'file_system': partition.fstype,
                    'total_size': partition_usage.total,
                    'used': partition_usage.used,
                    'free': partition_usage.free,
                    'percentage': (partition_usage.used / partition_usage.total) * 100
                }
            except PermissionError:
                disk_info[partition.device] = {
                    'mountpoint': partition.mountpoint,
                    'file_system': partition.fstype,
                    'error': 'Permission denied'
                }
        
        info_dict['disk'] = disk_info
        
        # Network Information
        try:
            hostname = socket.gethostname()
            local_ip = socket.gethostbyname(hostname)
            
            # Get network interfaces
            network_interfaces = {}
            for interface_name, interface_addresses in psutil.net_if_addrs().items():
                addresses = []
                for address in interface_addresses:
                    addresses.append({
                        'family': str(address.family),
                        'address': address.address,
                        'netmask': address.netmask,
                        'broadcast': address.broadcast
                    })
                network_interfaces[interface_name] = addresses
            
            # Get network statistics
            net_io = psutil.net_io_counters()
            
            info_dict['network'] = {
                'hostname': hostname,
                'local_ip': local_ip,
                'interfaces': network_interfaces,
                'io_stats': {
                    'bytes_sent': net_io.bytes_sent,
                    'bytes_received': net_io.bytes_recv,
                    'packets_sent': net_io.packets_sent,
                    'packets_received': net_io.packets_recv
                } if net_io else {}
            }
        except Exception as e:
            info_dict['network'] = {'error': str(e)}
        
        # Process Information (top 10 by memory usage)
        try:
            processes = []
            for proc in psutil.process_iter(['pid', 'name', 'memory_percent', 'cpu_percent']):
                try:
                    processes.append(proc.info)
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    pass
            
            # Sort by memory usage and get top 10
            top_processes = sorted(processes, key=lambda x: x['memory_percent'] or 0, reverse=True)[:10]
            
            info_dict['processes'] = {
                'total_count': len(processes),
                'top_memory_usage': top_processes
            }
        except Exception as e:
            info_dict['processes'] = {'error': str(e)}
        
        logging.info("System information gathered successfully")
        return info_dict
        
    except Exception as e:
        logging.error(f"Error gathering system information: {e}")
        return {'error': str(e), 'timestamp': datetime.datetime.now().isoformat()}

def print_system_info(info_dict):
    """Print all system information to terminal in a formatted way"""
    print("\n" + "=" * 80)
    print(f"SYSTEM INFORMATION REPORT - {info_dict['timestamp']}")
    print("=" * 80)
    
    # System Information
    if 'system' in info_dict:
        print("\n🖥️  OPERATING SYSTEM INFORMATION:")
        print("-" * 40)
        for key, value in info_dict['system'].items():
            print(f"{key.replace('_', ' ').title():<20}: {value}")
    
    # CPU Information
    if 'cpu' in info_dict:
        print("\n🔧 CPU INFORMATION:")
        print("-" * 40)
        cpu = info_dict['cpu']
        print(f"Physical Cores      : {cpu['physical_cores']}")
        print(f"Total Cores         : {cpu['total_cores']}")
        print(f"Max Frequency       : {cpu['max_frequency']} MHz")
        print(f"Current Frequency   : {cpu['current_frequency']} MHz")
        print(f"CPU Usage           : {cpu['cpu_usage_percent']}%")
    
    # Memory Information
    if 'memory' in info_dict:
        print("\n💾 MEMORY INFORMATION:")
        print("-" * 40)
        mem = info_dict['memory']['virtual']
        swap = info_dict['memory']['swap']
        print(f"Virtual Memory:")
        print(f"  Total             : {mem['total_gb']} GB")
        print(f"  Available         : {mem['available_gb']} GB")
        print(f"  Used              : {mem['used_gb']} GB")
        print(f"  Usage Percentage  : {mem['percentage']}%")
        print(f"Swap Memory:")
        print(f"  Total             : {swap['total_gb']} GB")
        print(f"  Used              : {swap['used_gb']} GB")
        print(f"  Usage Percentage  : {swap['percentage']}%")
    
    # Disk Information
    if 'disk' in info_dict:
        print("\n💿 DISK INFORMATION:")
        print("-" * 40)
        for i, partition in enumerate(info_dict['disk']['partitions'], 1):
            print(f"Partition {i}:")
            print(f"  Device            : {partition['device']}")
            print(f"  Mountpoint        : {partition['mountpoint']}")
            print(f"  Filesystem        : {partition['filesystem']}")
            if isinstance(partition['usage'], dict):
                usage = partition['usage']
                print(f"  Total Size        : {usage['total_gb']} GB")
                print(f"  Used              : {usage['used_gb']} GB")
                print(f"  Free              : {usage['free_gb']} GB")
                print(f"  Usage Percentage  : {usage['percentage']}%")
            else:
                print(f"  Usage             : {partition['usage']}")
            print()
    
    # Network Information
    if 'network' in info_dict:
        print("🌐 NETWORK INFORMATION:")
        print("-" * 40)
        net = info_dict['network']
        print(f"Hostname            : {net.get('hostname', 'N/A')}")
        print(f"Local IP Address    : {net.get('local_ip', 'N/A')}")
        if 'error' in net:
            print(f"Network Stats       : {net['error']}")
        else:
            print(f"Bytes Sent          : {net.get('bytes_sent_mb', 'N/A')} MB")
            print(f"Bytes Received      : {net.get('bytes_received_mb', 'N/A')} MB")
            print(f"Packets Sent        : {net.get('packets_sent', 'N/A')}")
            print(f"Packets Received    : {net.get('packets_received', 'N/A')}")
    
    # Process Information
    if 'processes' in info_dict:
        print("\n🔄 TOP MEMORY CONSUMING PROCESSES:")
        print("-" * 40)
        if 'error' in info_dict['processes']:
            print(f"Error: {info_dict['processes']['error']}")
        else:
            print(f"{'PID':<8} {'Name':<25} {'Memory %':<10} {'CPU %':<8}")
            print("-" * 51)
            for proc in info_dict['processes']['top_memory_consumers']:
                pid = proc.get('pid', 'N/A')
                name = proc.get('name', 'N/A')[:24]  # Truncate long names
                mem_percent = proc.get('memory_percent', 0) or 0
                cpu_percent = proc.get('cpu_percent', 0) or 0
                print(f"{pid:<8} {name:<25} {mem_percent:<10.2f} {cpu_percent:<8.2f}")
    
    print("\n" + "=" * 80)
    print("SYSTEM INFORMATION GATHERING COMPLETED")
    print("=" * 80)

def save_data(info_dict):
    """Save system information to JSON file for web integration"""
    try:
        # Save to JSON file for web dashboard integration
        json_filename = os.path.join(os.path.dirname(__file__), 'system_info.json')
        with open(json_filename, 'w') as json_file:
            json.dump(info_dict, json_file, indent=2, default=str)
        
        logging.info(f"System information saved to {json_filename}")
        print(f"📁 Data saved to: {json_filename}")
        
        # Also save to timestamped file for history
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        history_filename = os.path.join(os.path.dirname(__file__), f'system_info_{timestamp}.json')
        with open(history_filename, 'w') as history_file:
            json.dump(info_dict, history_file, indent=2, default=str)
        
        print(f"📁 Historical data saved to: {history_filename}")
        
    except Exception as e:
        logging.error(f"Error saving data: {e}")
        print(f"❌ Error saving data: {e}")

def main():
    """Auto-execute system information gathering and display"""
    print("🚀 Starting automatic system information gathering...")
    print("⏳ Please wait while collecting data...")
    
    # Small delay to show it's working
    time.sleep(1)
    
    try:
        # Get system information
        info = get_system_info()
        
        # Print all information to terminal
        print_system_info(info)
        
        # Save data to file
        save_data(info)
        
        # Log completion
        logging.info("System information gathering completed successfully")
        
        print("\n✅ Process completed! All information displayed above.")
        print("📊 Data ready for dashboard integration.")
        
        return info  # Return data for integration
        
    except KeyboardInterrupt:
        print("\n⚠️  Process interrupted by user.")
        return None
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        logging.error(f"Unexpected error in main: {e}")
        return None

# Auto-execute when script is run
if __name__ == "__main__":
    main()