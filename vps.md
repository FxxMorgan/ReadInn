ubuntu@proyectos:~$ sudo systemctl status nginx
● nginx.service - A high performance web server and a reverse proxy server
     Loaded: loaded (/lib/systemd/system/nginx.service; enabled; vendor preset: enabled)
     Active: active (running) since Tue 2026-07-21 06:40:36 UTC; 3 weeks 3 days ago
       Docs: man:nginx(8)
   Main PID: 33886 (nginx)
      Tasks: 3 (limit: 14231)
     Memory: 3.2M
        CPU: 57ms
     CGroup: /system.slice/nginx.service
             ├─33886 "nginx: master process /usr/sbin/nginx -g daemon on; master_process on;"
             ├─33888 "nginx: worker process" "" "" "" "" "" "" "" "" "" "" "" "" "" "" "" "" "" "" "" "" "" "" "" "" "" "" ""
             └─33889 "nginx: worker process" "" "" "" "" "" "" "" "" "" "" "" "" "" "" "" "" "" "" "" "" "" "" "" "" "" "" ""

Jul 21 06:40:36 proyectos systemd[1]: Starting A high performance web server and a reverse proxy server...

ubuntu@proyectos:~$ fastfetch 
                             ....              ubuntu@proyectos
              .',:clooo:  .:looooo:.           ----------------
           .;looooooooc  .oooooooooo'          OS: Ubuntu 22.04.5 LTS (Jammy Jellyfish) aarch64
        .;looooool:,''.  :ooooooooooc          Host: KVM Virtual Machine (virt-7.2)
       ;looool;.         'oooooooooo,          Kernel: Linux 6.8.0-1057-oracle
      ;clool'             .cooooooc.  ,,       Uptime: 25 days, 47 mins
         ...                ......  .:oo,      Packages: 911 (dpkg), 3 (snap)
  .;clol:,.                        .loooo'     Shell: bash 5.1.16
 :ooooooooo,                        'ooool     Display (QEMU Monitor): 1280x800 in 15", 75 Hz
'ooooooooooo.                        loooo.    Terminal: /dev/pts/0 8.9p1 Ubuntu-3ubuntu0.16
'ooooooooool                         coooo.    CPU: Neoverse-N1 (2)
 ,loooooooc.                        .loooo.    GPU: RedHat Virtio GPU
   .,;;;'.                          ;ooooc     Memory: 2.33 GiB / 11.65 GiB (20%)
       ...                         ,ooool.     Swap: Disabled
    .cooooc.              ..',,'.  .cooo.      Disk (/): 21.22 GiB / 44.96 GiB (47%) - ext4
      ;ooooo:.           ;oooooooc.  :l.       Local IP (enp0s6): 10.0.0.6/24
       .coooooc,..      coooooooooo.           Locale: C.UTF-8
         .:ooooooolc:. .ooooooooooo'           
           .':loooooo;  ,oooooooooc                                    
               ..';::c'  .;loooo:'                                     


IP : 159.112.141.10
Dominio : cypher.cl