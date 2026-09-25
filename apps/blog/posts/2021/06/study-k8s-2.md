---
title: 'K8s 공부 (2)'
tags:
  - kubernetes
  - devops
  - career
published: true
date: 2021-06-10 22:30:19
description: '무지성에서 시작하는 K8s 공부해보기 시리즈(2)'
---

[K8s 공부 (1)](/2021/06/study-k8s-1)에서 이어집니다.

## Minikube

- 앞서 언급했던 것 처럼, 마스터와 워커 노드를 구성하는데 있어서는 많은 리소스와 환경이 필요함 (2마스터와 3개 이상의 워커 노드...)
- 이는 테스트 하거나, 로컬에서 실험을 하는데 있어서는 부적절함
- 그래서 등장한 것이 Minikube
- 하나의 머신에 하나의 마스터 프로세스와 워커 프로세스를 모두 집어 넣음. docker가 기본으로 설치되어 있음.
- 컴퓨터의 버츄얼 박스 등 가상 머신에서 실행됨.
- 1 node K8s cluster
- 테스트 용도로 사용됨.

## Kubectl

- pod를 만들고, 다양한 컴포넌트를 만들기 위한 도구
- 마스터 프로세스의 Api server가 실제 클러스터와 상호작용할 수 있는 유일한 창구
- 따라서 무언가를 하기 위해서는, Api Server를 통해야 함.
- 이 Apiserver를 사용할 수 있는 것이 kubectl
- 가장 강력한 도구로, 무엇이든 할 수가 있음.

KubeCtl은 minikube 뿐만 아니라 실제 프로덕션 K8s에서도 사용할 수 있음.

## 설치 및 사용

https://minikube.sigs.k8s.io/docs/start/ 링크에서 가능. 그러나 앞에서 언급했듯, 가상화 환경이 필요하기 때문에 Virtual Box 등도 설치해야 한다.

```bash
> brew update
> brew install hyperkit
> brew install minikube
```

```bash
» kubectl
kubectl controls the Kubernetes cluster manager.

 Find more information at: https://kubernetes.io/docs/reference/kubectl/overview/

Basic Commands (Beginner):
  create        Create a resource from a file or from stdin.
  expose        Take a replication controller, service, deployment or pod and expose it as a new Kubernetes Service
  run           Run a particular image on the cluster
  set           Set specific features on objects

Basic Commands (Intermediate):
  explain       Documentation of resources
  get           Display one or many resources
  edit          Edit a resource on the server
  delete        Delete resources by filenames, stdin, resources and names, or by resources and label selector

Deploy Commands:
  rollout       Manage the rollout of a resource
  scale         Set a new size for a Deployment, ReplicaSet or Replication Controller
  autoscale     Auto-scale a Deployment, ReplicaSet, StatefulSet, or ReplicationController

Cluster Management Commands:
  certificate   Modify certificate resources.
  cluster-info  Display cluster info
  top           Display Resource (CPU/Memory) usage.
  cordon        Mark node as unschedulable
  uncordon      Mark node as schedulable
  drain         Drain node in preparation for maintenance
  taint         Update the taints on one or more nodes

Troubleshooting and Debugging Commands:
  describe      Show details of a specific resource or group of resources
  logs          Print the logs for a container in a pod
  attach        Attach to a running container
  exec          Execute a command in a container
  port-forward  Forward one or more local ports to a pod
  proxy         Run a proxy to the Kubernetes API server
  cp            Copy files and directories to and from containers.
  auth          Inspect authorization
  debug         Create debugging sessions for troubleshooting workloads and nodes

Advanced Commands:
  diff          Diff live version against would-be applied version
  apply         Apply a configuration to a resource by filename or stdin
  patch         Update field(s) of a resource
  replace       Replace a resource by filename or stdin
  wait          Experimental: Wait for a specific condition on one or many resources.
  kustomize     Build a kustomization target from a directory or URL.

Settings Commands:
  label         Update the labels on a resource
  annotate      Update the annotations on a resource
  completion    Output shell completion code for the specified shell (bash or zsh)

Other Commands:
  api-resources Print the supported API resources on the server
  api-versions  Print the supported API versions on the server, in the form of "group/version"
  config        Modify kubeconfig files
  plugin        Provides utilities for interacting with plugins.
  version       Print the client and server version information

Usage:
  kubectl [flags] [options]

Use "kubectl <command> --help" for more information about a given command.
Use "kubectl options" for a list of global command-line options (applies to all commands).
```

```bash
» minikube
minikube provisions and manages local Kubernetes clusters optimized for development workflows.

Basic Commands:
  start          Starts a local Kubernetes cluster
  status         Gets the status of a local Kubernetes cluster
  stop           Stops a running local Kubernetes cluster
  delete         Deletes a local Kubernetes cluster
  dashboard      Access the Kubernetes dashboard running within the minikube cluster
  pause          pause Kubernetes
  unpause        unpause Kubernetes

Images Commands:
  docker-env     Configure environment to use minikube's Docker daemon
  podman-env     Configure environment to use minikube's Podman service
  cache          Add, delete, or push a local image into minikube
  image          Manage images

Configuration and Management Commands:
  addons         Enable or disable a minikube addon
  config         Modify persistent configuration values
  profile        Get or list the current profiles (clusters)
  update-context Update kubeconfig in case of an IP or port change

Networking and Connectivity Commands:
  service        Returns a URL to connect to a service
  tunnel         Connect to LoadBalancer services

Advanced Commands:
  mount          Mounts the specified directory into minikube
  ssh            Log into the minikube environment (for debugging)
  kubectl        Run a kubectl binary matching the cluster version
  node           Add, remove, or list additional nodes
  cp             Copy the specified file into minikube

Troubleshooting Commands:
  ssh-key        Retrieve the ssh identity key path of the specified node
  ssh-host       Retrieve the ssh host key of the specified node
  ip             Retrieves the IP address of the specified node
  logs           Returns logs to debug a local Kubernetes cluster
  update-check   Print current and latest version number
  version        Print the version of minikube

Other Commands:
  completion     Generate command completion for a shell

Use "minikube <command> --help" for more information about a given command.
```

모두 정상적으로 설치된 것을 볼 수 있다.

## minikube 생성해보기

```bash
» minikube start --vm-driver=hyperkit
😄  minikube v1.20.0 on Darwin 11.4
✨  Using the hyperkit driver based on existing profile
👍  Starting control plane node minikube in cluster minikube
🏃  Updating the running hyperkit "minikube" VM ...
🐳  Preparing Kubernetes v1.20.2 on Docker 20.10.6 ...
🔎  Verifying Kubernetes components...
    ▪ Using image gcr.io/k8s-minikube/storage-provisioner:v5
🌟  Enabled addons: storage-provisioner, default-storageclass
🏄  Done! kubectl is now configured to use "minikube" cluster and "default" namespace by default
```

```bash
» kubectl get nodes
NAME       STATUS   ROLES                  AGE     VERSION
minikube   Ready    control-plane,master   2m16s   v1.20.2
```

```bash
» minikube status
minikube
type: Control Plane
host: Running
kubelet: Running
apiserver: Running
kubeconfig: Configured
```

```bash
» kubectl version
Client Version: version.Info{Major:"1", Minor:"21", GitVersion:"v1.21.0", GitCommit:"cb303e613a121a29364f75cc67d3d580833a7479", GitTreeState:"clean", BuildDate:"2021-04-08T21:16:14Z", GoVersion:"go1.16.3", Compiler:"gc", Platform:"darwin/amd64"}
Server Version: version.Info{Major:"1", Minor:"20", GitVersion:"v1.20.2", GitCommit:"faecb196815e248d3ecfb03c680a4507229c2a56", GitTreeState:"clean", BuildDate:"2021-01-13T13:20:00Z", GoVersion:"go1.15.5", Compiler:"gc", Platform:"linux/amd64"}
```

## Kubectl의 주요 커맨드 알아보기

### 생성과 수정

```bash
» kubectl get nodes
NAME       STATUS   ROLES                  AGE     VERSION
minikube   Ready    control-plane,master   4m26s   v1.20.2

» kubectl get pod
No resources found in default namespace.


» kubectl get services
NAME         TYPE        CLUSTER-IP   EXTERNAL-IP   PORT(S)   AGE
kubernetes   ClusterIP   10.96.0.1    <none>        443/TCP   4m46s

```

pod 생성하기?

- pod는 가장 작은 단위
- pod를 직접적으로 만들지는 않음
- 앞서 설명했듯, deployment를 활용해서 추상화를 통해서 많음

```bash
» kubectl create deployment nginx-depl --image=nginx
deployment.apps/nginx-depl created
```

```bash
» kubectl get deployment
NAME         READY   UP-TO-DATE   AVAILABLE   AGE
nginx-depl   1/1     1            1           26s

» kubectl get pod
NAME                          READY   STATUS    RESTARTS   AGE
nginx-depl-5c8bf76b5b-fk5b9   1/1     Running   0          39s
```

- deployment에는 pod를 생성하기 위한 모든 정보가 들어가 있음.
- `kubectl create deployment nginx-depl --image=nginx`를 통해서, 가장 기초적인 설정 (deployment명과 이미지명 `nginx`)으로 deployment를 생성함.
- 나머지는 모두 기본값을 설정함.

```bash
» kubectl get replicaset
NAME                    DESIRED   CURRENT   READY   AGE
nginx-depl-5c8bf76b5b   1         1         1       2m41s
```

`Replicaset`은 pod의 복제본을 관리하는 역할을 담당하고 있음. 절댜로 수동으로 추가하거나, 삭제하는 것이 아님. deployment의 설정을 통해서 모든 것이 자동으로 이루어지는 것이다.

위에서 보는 것처럼, 1pod와 1replica가 생성된 것을 볼 수 있음.

- `Deployment`는 `ReplicaSet`을 관리하고
- `ReplicaSet`은 pod의 모든 복제본을 관리하고
- `Pod`는 컨테이너의 추상화를 담당하고 있음.
- 그리고 그외의 모든 하위 단계는 자동으로 K8s에 의해 관리되고 있음.

```bash
» kubectl edit deployment nginx-depl
```

자동으로 생성된 설정 파일을 볼 수 있음.

```yaml
# Please edit the object below. Lines beginning with a '#' will be ignored,
# and an empty file will abort the edit. If an error occurs while saving this file will be
# reopened with the relevant failures.
#
apiVersion: apps/v1
kind: Deployment
metadata:
  annotations:
    deployment.kubernetes.io/revision: "1"
  creationTimestamp: "2021-06-10T14:08:04Z"
  generation: 1
  labels:
    app: nginx-depl
  name: nginx-depl
  namespace: default
  resourceVersion: "744"
  uid: 02fd65f5-7170-408a-bc98-1aa735b835ce
spec:
  progressDeadlineSeconds: 600
  replicas: 1
  revisionHistoryLimit: 10
  selector:
    matchLabels:
      app: nginx-depl
  strategy:
    rollingUpdate:
      maxSurge: 25%
      maxUnavailable: 25%
    type: RollingUpdate
  template:
    metadata:
      creationTimestamp: null
      labels:
        app: nginx-depl
    spec:
      containers:
      - image: nginx # 이거 뒤에 :1.16을 붙이고 저장해보자.
        imagePullPolicy: Always
        name: nginx
        resources: {}
        terminationMessagePath: /dev/termination-log
        terminationMessagePolicy: File
      dnsPolicy: ClusterFirst
      restartPolicy: Always
      schedulerName: default-scheduler
      securityContext: {}
      terminationGracePeriodSeconds: 30
        terminationMessagePath: /dev/termination-log
        terminationMessagePolicy: File
      dnsPolicy: ClusterFirst
      restartPolicy: Always
      schedulerName: default-scheduler
      securityContext: {}
      terminationGracePeriodSeconds: 30
status:
  availableReplicas: 1
  conditions:
  - lastTransitionTime: "2021-06-10T14:08:26Z"
    lastUpdateTime: "2021-06-10T14:08:26Z"
    message: Deployment has minimum availability.
    reason: MinimumReplicasAvailable
    status: "True"
    type: Available
  - lastTransitionTime: "2021-06-10T14:08:04Z"
    lastUpdateTime: "2021-06-10T14:08:26Z"
    message: ReplicaSet "nginx-depl-5c8bf76b5b" has successfully progressed.
    reason: NewReplicaSetAvailable
    status: "True"
    type: Progressing
  observedGeneration: 1
  readyReplicas: 1
  replicas: 1
  updatedReplicas: 1
```

```bash
» kubectl get replicaset
NAME                    DESIRED   CURRENT   READY   AGE
nginx-depl-5c8bf76b5b   0         0         0       10m
nginx-depl-7fc44fc5d4   1         1         1       70s
```

### 디버깅

```bash
» kubectl get pod
NAME                          READY   STATUS    RESTARTS   AGE
nginx-depl-7fc44fc5d4-wmh8z   1/1     Running   0          2m42s

~
» kubectl logs nginx-depl-7fc44fc5d4-wmh8z

~
```

nginx에 뭐 들어온게 없어서 로그가 하나도 안찍혀있다.

```bash
» kubectl create deployment mongo-depl --image=mongo
deployment.apps/mongo-depl created

~
» kubectl get pod
NAME                          READY   STATUS              RESTARTS   AGE
mongo-depl-5fd6b7d4b4-tvzt6   0/1     ContainerCreating   0          6s
nginx-depl-7fc44fc5d4-wmh8z   1/1     Running             0          4m32s

» kubectl describe pod mongo-depl-5fd6b7d4b4-tvzt6
Name:         mongo-depl-5fd6b7d4b4-tvzt6
Namespace:    default
Priority:     0
Node:         minikube/192.168.64.3
Start Time:   Thu, 10 Jun 2021 23:21:28 +0900
Labels:       app=mongo-depl
              pod-template-hash=5fd6b7d4b4
Annotations:  <none>
Status:       Running
IP:           172.17.0.3
IPs:
  IP:           172.17.0.3
Controlled By:  ReplicaSet/mongo-depl-5fd6b7d4b4
Containers:
  mongo:
    Container ID:   docker://7d8341691a7e94d0992d0d8b2c2a4bab70820c4c1fcd730a86bb2bcc19cb0950
    Image:          mongo
    Image ID:       docker-pullable://mongo@sha256:419ee9e6676031a18186f20f6bcebb2c0a52cb386502293563dc7ff2968a1b89
    Port:           <none>
    Host Port:      <none>
    State:          Running
      Started:      Thu, 10 Jun 2021 23:22:06 +0900
    Ready:          True
    Restart Count:  0
    Environment:    <none>
    Mounts:
      /var/run/secrets/kubernetes.io/serviceaccount from default-token-tffzh (ro)
Conditions:
  Type              Status
  Initialized       True
  Ready             True
  ContainersReady   True
  PodScheduled      True
Volumes:
  default-token-tffzh:
    Type:        Secret (a volume populated by a Secret)
    SecretName:  default-token-tffzh
    Optional:    false
QoS Class:       BestEffort
Node-Selectors:  <none>
Tolerations:     node.kubernetes.io/not-ready:NoExecute op=Exists for 300s
                 node.kubernetes.io/unreachable:NoExecute op=Exists for 300s
Events:
  Type    Reason     Age   From               Message
  ----    ------     ----  ----               -------
  Normal  Scheduled  74s   default-scheduler  Successfully assigned default/mongo-depl-5fd6b7d4b4-tvzt6 to minikube
  Normal  Pulling    73s   kubelet            Pulling image "mongo"
  Normal  Pulled     37s   kubelet            Successfully pulled image "mongo" in 36.394396367s
  Normal  Created    37s   kubelet            Created container mongo
  Normal  Started    36s   kubelet            Started container mongo
```

```bash
» kubectl logs mongo-depl-5fd6b7d4b4-tvzt6
{"t":{"$date":"2021-06-10T14:22:06.043+00:00"},"s":"I",  "c":"CONTROL",  "id":23285,   "ctx":"main","msg":"Automatically disabling TLS 1.0, to force-enable TLS 1.0 specify --sslDisabledProtocols 'none'"}
{"t":{"$date":"2021-06-10T14:22:06.046+00:00"},"s":"W",  "c":"ASIO",     "id":22601,   "ctx":"main","msg":"No TransportLayer configured during NetworkInterface startup"}
{"t":{"$date":"2021-06-10T14:22:06.046+00:00"},"s":"I",  "c":"NETWORK",  "id":4648601, "ctx":"main","msg":"Implicit TCP FastOpen unavailable. If TCP FastOpen is required, set tcpFastOpenServer, tcpFastOpenClient, and tcpFastOpenQueueSize."}
{"t":{"$date":"2021-06-10T14:22:06.046+00:00"},"s":"I",  "c":"STORAGE",  "id":4615611, "ctx":"initandlisten","msg":"MongoDB starting","attr":{"pid":1,"port":27017,"dbPath":"/data/db","architecture":"64-bit","host":"mongo-depl-5fd6b7d4b4-tvzt6"}}
{"t":{"$date":"2021-06-10T14:22:06.046+00:00"},"s":"I",  "c":"CONTROL",  "id":23403,   "ctx":"initandlisten","msg":"Build Info","attr":{"buildInfo":{"version":"4.4.6","gitVersion":"72e66213c2c3eab37d9358d5e78ad7f5c1d0d0d7","openSSLVersion":"OpenSSL 1.1.1  11 Sep 2018","modules":[],"allocator":"tcmalloc","environment":{"distmod":"ubuntu1804","distarch":"x86_64","target_arch":"x86_64"}}}}
{"t":{"$date":"2021-06-10T14:22:06.046+00:00"},"s":"I",  "c":"CONTROL",  "id":51765,   "ctx":"initandlisten","msg":"Operating System","attr":{"os":{"name":"Ubuntu","version":"18.04"}}}
{"t":{"$date":"2021-06-10T14:22:06.046+00:00"},"s":"I",  "c":"CONTROL",  "id":21951,   "ctx":"initandlisten","msg":"Options set by command line","attr":{"options":{"net":{"bindIp":"*"}}}}
{"t":{"$date":"2021-06-10T14:22:06.047+00:00"},"s":"I",  "c":"STORAGE",  "id":22297,   "ctx":"initandlisten","msg":"Using the XFS filesystem is strongly recommended with the WiredTiger storage engine. See http://dochub.mongodb.org/core/prodnotes-filesystem","tags":["startupWarnings"]}
{"t":{"$date":"2021-06-10T14:22:06.047+00:00"},"s":"I",  "c":"STORAGE",  "id":22315,   "ctx":"initandlisten","msg":"Opening WiredTiger","attr":{"config":"create,cache_size=1409M,session_max=33000,eviction=(threads_min=4,threads_max=4),config_base=false,statistics=(fast),log=(enabled=true,archive=true,path=journal,compressor=snappy),file_manager=(close_idle_time=100000,close_scan_interval=10,close_handle_minimum=250),statistics_log=(wait=0),verbose=[recovery_progress,checkpoint_progress,compact_progress],"}}
{"t":{"$date":"2021-06-10T14:22:06.563+00:00"},"s":"I",  "c":"STORAGE",  "id":22430,   "ctx":"initandlisten","msg":"WiredTiger message","attr":{"message":"[1623334926:563229][1:0x7fc32da96ac0], txn-recover: [WT_VERB_RECOVERY | WT_VERB_RECOVERY_PROGRESS] Set global recovery timestamp: (0, 0)"}}
{"t":{"$date":"2021-06-10T14:22:06.563+00:00"},"s":"I",  "c":"STORAGE",  "id":22430,   "ctx":"initandlisten","msg":"WiredTiger message","attr":{"message":"[1623334926:563299][1:0x7fc32da96ac0], txn-recover: [WT_VERB_RECOVERY | WT_VERB_RECOVERY_PROGRESS] Set global oldest timestamp: (0, 0)"}}
{"t":{"$date":"2021-06-10T14:22:06.569+00:00"},"s":"I",  "c":"STORAGE",  "id":4795906, "ctx":"initandlisten","msg":"WiredTiger opened","attr":{"durationMillis":522}}
{"t":{"$date":"2021-06-10T14:22:06.569+00:00"},"s":"I",  "c":"RECOVERY", "id":23987,   "ctx":"initandlisten","msg":"WiredTiger recoveryTimestamp","attr":{"recoveryTimestamp":{"$timestamp":{"t":0,"i":0}}}}
{"t":{"$date":"2021-06-10T14:22:06.577+00:00"},"s":"I",  "c":"STORAGE",  "id":4366408, "ctx":"initandlisten","msg":"No table logging settings modifications are required for existing WiredTiger tables","attr":{"loggingEnabled":true}}
{"t":{"$date":"2021-06-10T14:22:06.577+00:00"},"s":"I",  "c":"STORAGE",  "id":22262,   "ctx":"initandlisten","msg":"Timestamp monitor starting"}
{"t":{"$date":"2021-06-10T14:22:06.579+00:00"},"s":"W",  "c":"CONTROL",  "id":22120,   "ctx":"initandlisten","msg":"Access control is not enabled for the database. Read and write access to data and configuration is unrestricted","tags":["startupWarnings"]}
{"t":{"$date":"2021-06-10T14:22:06.580+00:00"},"s":"I",  "c":"STORAGE",  "id":20320,   "ctx":"initandlisten","msg":"createCollection","attr":{"namespace":"admin.system.version","uuidDisposition":"provided","uuid":{"uuid":{"$uuid":"782b81b2-5b7e-4f69-9e3e-bf5deed7e4d1"}},"options":{"uuid":{"$uuid":"782b81b2-5b7e-4f69-9e3e-bf5deed7e4d1"}}}}
{"t":{"$date":"2021-06-10T14:22:06.586+00:00"},"s":"I",  "c":"INDEX",    "id":20345,   "ctx":"initandlisten","msg":"Index build: done building","attr":{"buildUUID":null,"namespace":"admin.system.version","index":"_id_","commitTimestamp":{"$timestamp":{"t":0,"i":0}}}}
{"t":{"$date":"2021-06-10T14:22:06.587+00:00"},"s":"I",  "c":"COMMAND",  "id":20459,   "ctx":"initandlisten","msg":"Setting featureCompatibilityVersion","attr":{"newVersion":"4.4"}}
{"t":{"$date":"2021-06-10T14:22:06.587+00:00"},"s":"I",  "c":"STORAGE",  "id":20536,   "ctx":"initandlisten","msg":"Flow Control is enabled on this deployment"}
{"t":{"$date":"2021-06-10T14:22:06.588+00:00"},"s":"I",  "c":"STORAGE",  "id":20320,   "ctx":"initandlisten","msg":"createCollection","attr":{"namespace":"local.startup_log","uuidDisposition":"generated","uuid":{"uuid":{"$uuid":"874aa57e-a309-4546-a090-7a6a1602f4e0"}},"options":{"capped":true,"size":10485760}}}
{"t":{"$date":"2021-06-10T14:22:06.599+00:00"},"s":"I",  "c":"INDEX",    "id":20345,   "ctx":"initandlisten","msg":"Index build: done building","attr":{"buildUUID":null,"namespace":"local.startup_log","index":"_id_","commitTimestamp":{"$timestamp":{"t":0,"i":0}}}}
{"t":{"$date":"2021-06-10T14:22:06.599+00:00"},"s":"I",  "c":"FTDC",     "id":20625,   "ctx":"initandlisten","msg":"Initializing full-time diagnostic data capture","attr":{"dataDirectory":"/data/db/diagnostic.data"}}
{"t":{"$date":"2021-06-10T14:22:06.601+00:00"},"s":"I",  "c":"STORAGE",  "id":20320,   "ctx":"LogicalSessionCacheRefresh","msg":"createCollection","attr":{"namespace":"config.system.sessions","uuidDisposition":"generated","uuid":{"uuid":{"$uuid":"ddd2219d-532c-46db-90a2-c2e01492632f"}},"options":{}}}
{"t":{"$date":"2021-06-10T14:22:06.602+00:00"},"s":"I",  "c":"CONTROL",  "id":20712,   "ctx":"LogicalSessionCacheReap","msg":"Sessions collection is not set up; waiting until next sessions reap interval","attr":{"error":"NamespaceNotFound: config.system.sessions does not exist"}}
{"t":{"$date":"2021-06-10T14:22:06.602+00:00"},"s":"I",  "c":"NETWORK",  "id":23015,   "ctx":"listener","msg":"Listening on","attr":{"address":"/tmp/mongodb-27017.sock"}}
{"t":{"$date":"2021-06-10T14:22:06.602+00:00"},"s":"I",  "c":"NETWORK",  "id":23015,   "ctx":"listener","msg":"Listening on","attr":{"address":"0.0.0.0"}}
{"t":{"$date":"2021-06-10T14:22:06.603+00:00"},"s":"I",  "c":"NETWORK",  "id":23016,   "ctx":"listener","msg":"Waiting for connections","attr":{"port":27017,"ssl":"off"}}
{"t":{"$date":"2021-06-10T14:22:06.614+00:00"},"s":"I",  "c":"INDEX",    "id":20345,   "ctx":"LogicalSessionCacheRefresh","msg":"Index build: done building","attr":{"buildUUID":null,"namespace":"config.system.sessions","index":"_id_","commitTimestamp":{"$timestamp":{"t":0,"i":0}}}}
{"t":{"$date":"2021-06-10T14:22:06.614+00:00"},"s":"I",  "c":"INDEX",    "id":20345,   "ctx":"LogicalSessionCacheRefresh","msg":"Index build: done building","attr":{"buildUUID":null,"namespace":"config.system.sessions","index":"lsidTTLIndex","commitTimestamp":{"$timestamp":{"t":0,"i":0}}}}
{"t":{"$date":"2021-06-10T14:23:06.579+00:00"},"s":"I",  "c":"STORAGE",  "id":22430,   "ctx":"WTCheckpointThread","msg":"WiredTiger message","attr":{"message":"[1623334986:579376][1:0x7fc320582700], WT_SESSION.checkpoint: [WT_VERB_CHECKPOINT_PROGRESS] saving checkpoint snapshot min: 34, snapshot max: 34 snapshot count: 0, oldest timestamp: (0, 0) , meta checkpoint timestamp: (0, 0)"}}
```

mongodb의 로그가 찍혀있는 것을 볼 수 있다.

```bash
» kubectl get pod
NAME                          READY   STATUS    RESTARTS   AGE
mongo-depl-5fd6b7d4b4-tvzt6   1/1     Running   0          2m28s
nginx-depl-7fc44fc5d4-wmh8z   1/1     Running   0          6m54s

» kubectl exec -it mongo-depl-5fd6b7d4b4-tvzt6 -- bin/bash
root@mongo-depl-5fd6b7d4b4-tvzt6:/#
root@mongo-depl-5fd6b7d4b4-tvzt6:/# ls
bin  boot  data  dev  docker-entrypoint-initdb.d  etc  home  js-yaml.js  lib  lib64  media  mnt  opt  proc  root  run  sbin  srv  sys  tmp  usr  var
root@mongo-depl-5fd6b7d4b4-tvzt6:/# exit
exit
```

mongodb 컨테이너의 bash에 접근했다.

### deployment 삭제

```bash
» kubectl get deployment
NAME         READY   UP-TO-DATE   AVAILABLE   AGE
mongo-depl   1/1     1            1           5m25s
nginx-depl   1/1     1            1           18m

~
» kubectl get pod
NAME                          READY   STATUS    RESTARTS   AGE
mongo-depl-5fd6b7d4b4-tvzt6   1/1     Running   0          5m29s
nginx-depl-7fc44fc5d4-wmh8z   1/1     Running   0          9m55s

~
» kubectl delete deployment mongo-depl
deployment.apps "mongo-depl" deleted

~
» kubectl get pod
NAME                          READY   STATUS    RESTARTS   AGE
nginx-depl-7fc44fc5d4-wmh8z   1/1     Running   0          10m

~
» kubectl get replicaset
NAME                    DESIRED   CURRENT   READY   AGE
nginx-depl-5c8bf76b5b   0         0         0       19m
nginx-depl-7fc44fc5d4   1         1         1       10m
```

앞서서 bash 명령어로 deployment를 만드는 것을 살펴보았다. 그러나 이런 명령어를 일일이 써서 만드는 것은 굉장히 번거로우므로, 일반적으로는 설정파일을 통해서 만들게 된다.

```yaml
apiVersion: apps/v1
kind: Deployment # 만들려고 하는 것
metadata:
  name: nginx-deployment # 이름
  labels:
    app: nginx
spec:
  replicas: 1 # 레플리카 갯수
  selector:
    matchLabels:
      app: nginx
  template: # blueprint
    metadata:
      labels:
        app: nginx
    spec: # pod와 관련된 내용
      containers:
        - name: nginx
          image: nginx:1.16
          ports:
            - containerPort: 80
```

```bash
» kubectl apply -f nginx-deployment.yaml
deployment.apps/nginx-deployment created

» kubectl get pod
NAME                                READY   STATUS    RESTARTS   AGE
nginx-deployment-644599b9c9-qt6xv   1/1     Running   0          27s

» kubectl get deployment
NAME               READY   UP-TO-DATE   AVAILABLE   AGE
nginx-deployment   1/1     1            1           39s
```

파일에서 replica를 2개로 늘리고 다시 적용해보자.

```bash
» kubectl apply -f nginx-deployment.yaml
deployment.apps/nginx-deployment configured

» kubectl get deployment
NAME               READY   UP-TO-DATE   AVAILABLE   AGE
nginx-deployment   2/2     2            2           85s

» kubectl get pod
NAME                                READY   STATUS    RESTARTS   AGE
nginx-deployment-644599b9c9-qt6xv   1/1     Running   0          94s
nginx-deployment-644599b9c9-wjgbt   1/1     Running   0          38s

» kubectl get replicaset
NAME                          DESIRED   CURRENT   READY   AGE
nginx-deployment-644599b9c9   2         2         2       109s
```

## 요약

- deployment 생성: `kubectl create deployment [name]`
- deployment 수정: `kubectl edit deployment [name]`
- deployment 삭제: `kubectl delete deployment [name]`

- 각 종 상태보는 명령어 : `kubectl get nodes | pod | services | replicaset | deployment`
- 로그 보기: `kubectl logs [pod name]`
- pod 터미널 들어가기: `kubectl exec -it [pod name] -- bin/bash`
- pod 정보 보기: `kubectl describe pod [pod name]
- 설정파일 적용하기: `kubectl apply -f [filename]`
- 설정파일 삭제하기: `kubectl delete -f [filename]`
