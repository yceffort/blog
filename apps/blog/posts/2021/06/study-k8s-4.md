---
title: 'K8s 공부 (4)'
tags:
  - kubernetes
  - devops
  - career
published: true
date: 2021-06-19 21:13:55
description: '무지성에서 시작하는 K8s 공부해보기 시리즈(4) namespace의 정의를 정확히 알아야지'
---

[K8s 공부 (3)](/2021/06/study-k8s-3)에서 이어집니다.

## Namespace

- 리소스를 네임스페이스 안에 모아 둘 수 있다. 따라서 클러스트 하나에서 여러 개의 네임스페이스를 둘 수 있다. - 클러스트 내부의 가상의 클러스터로 볼 수 있다.
- 클러스터를 생성하면 기본적으로 네임스페이스가 4개 생성되어 있다.

```bash
» kubectl get namespace
NAME              STATUS   AGE
default           Active   8d
kube-node-lease   Active   8d
kube-public       Active   8d
kube-system       Active   8d
```

- `kube-system`: 이 namespace는 우리가 건들 필요가 없음. 시스템 프로세스, master, kubectl 을 관리
- `kube-public`: config map 과 같이 public하게 (인증이 없어도) 접근할 수 있는 데이터를 관리

```bash
» kubectl cluster-info
Kubernetes control plane is running at https://192.168.64.3:8443
KubeDNS is running at https://192.168.64.3:8443/api/v1/namespaces/kube-system/services/kube-dns:dns/proxy

To further debug and diagnose cluster problems, use 'kubectl cluster-info dump'.
```

- `kube-node-lease`: nodes의 하트비트. 각 노드의 현재 가용성을 관리.
- `default`: 여기서 우리가 만드는 리소스가 생성됨.

```bash
» kubectl create namespace my-namespace
namespace/my-namespace created
» kubectl get namespace
NAME              STATUS   AGE
default           Active   8d
kube-node-lease   Active   8d
kube-public       Active   8d
kube-system       Active   8d
my-namespace      Active   11s
```

이렇게 명령어로 생성하는 것 외에, namespace 설정 파일로도 만들 수 있음. (이게 더 낫다)

### 왜 네임스페이스를 만들어야 하나?

공식 문서에 따르면, 10명이하의 사용자가 있는 작은 프로젝트에서는 네임스페이스를 사용하지 말라고 한다. 뭐 그럼에도 네임스페이스별로 관리해서 개발하는 것이 여러가지 이점이 있다.

만약 클러스터에 하나의 네임스페이스만 있다고 가정해보자. 온갖 리소스들이 디폴트 네임스페이스에 생성되고, 복잡한 deployments의 경우 여러가지 리소스들이 섞이게 될 것이다. 그렇게 되면 여러개의 컴포넌트가 섞이게 되면서 현재의 overview를 볼 수 없을 것이다.

따라서 리소스를 네임스페이스를 통해서 그룹화 할 수 있다. `Database` `Monitoring` `Elastic Stack` `nginx-ingress` 등으로 관리 할 수 있다.

또 두개의 팀이 있고, 하나의 디폴트 네임스페이스만 쓴다고 가정해보자. 두 팀이 같은 deployment 이름으로 다른 설정으로 배포한다면, 하나의 deployment를 덮어버리는 사태가 발생한다. 이러한 충돌을 방지하기 위해서는, 팀별로 네임스페이스를 별도로 관리하는 것이 좋다. 그리고 팀별로 분리하게 되면, 서로의 리소스를 침해하는 등의 문제도 발생하지 않을 것이다.

마지막으로, staging, deployment 등 배포 레벨을 여러개로 관리하는 경우를 생각해보자. nginx-ingress controller, elastic 등은 배포 환경에 상관없이 재활용할 수 있으므로 네임스페이스를 활용하는 것이 좋다.

- 컴포넌트를 구조화 할 수 있음
- 팀 사이의 충돌을 방지할 수 있음
- 다른 환경에서도 서비스를 재사용할 수 있음
- 네임스페이스 별로 접근과 리소스를 제한할 수 있음

### 네임스페이스의 특징

- 다른 네임스페이스에 있는 대부분의 리소스에 접근할 수 없다. (다른 네임스페이스에 있는 configmap, secret을 참조하는 등을 할 수 없다.) 그러나, 서비스의 경우에는 가능하다.
- 일부 컴포넌트는 네임스페이스 내부에서 생성할 수 없다. (글로벌로 생성해야하는 것들) 이러한 것들에는 volume, node 가 있다.

`네임스페이스 내부에 생성할 수 없는 것들`

```bash
» kubectl api-resources --namespaced=false
NAME                              SHORTNAMES   APIVERSION                             NAMESPACED   KIND
componentstatuses                 cs           v1                                     false        ComponentStatus
namespaces                        ns           v1                                     false        Namespace
nodes                             no           v1                                     false        Node
persistentvolumes                 pv           v1                                     false        PersistentVolume
mutatingwebhookconfigurations                  admissionregistration.k8s.io/v1        false        MutatingWebhookConfiguration
validatingwebhookconfigurations                admissionregistration.k8s.io/v1        false        ValidatingWebhookConfiguration
customresourcedefinitions         crd,crds     apiextensions.k8s.io/v1                false        CustomResourceDefinition
apiservices                                    apiregistration.k8s.io/v1              false        APIService
tokenreviews                                   authentication.k8s.io/v1               false        TokenReview
selfsubjectaccessreviews                       authorization.k8s.io/v1                false        SelfSubjectAccessReview
selfsubjectrulesreviews                        authorization.k8s.io/v1                false        SelfSubjectRulesReview
subjectaccessreviews                           authorization.k8s.io/v1                false        SubjectAccessReview
certificatesigningrequests        csr          certificates.k8s.io/v1                 false        CertificateSigningRequest
flowschemas                                    flowcontrol.apiserver.k8s.io/v1beta1   false        FlowSchema
prioritylevelconfigurations                    flowcontrol.apiserver.k8s.io/v1beta1   false        PriorityLevelConfiguration
ingressclasses                                 networking.k8s.io/v1                   false        IngressClass
runtimeclasses                                 node.k8s.io/v1                         false        RuntimeClass
podsecuritypolicies               psp          policy/v1beta1                         false        PodSecurityPolicy
clusterrolebindings                            rbac.authorization.k8s.io/v1           false        ClusterRoleBinding
clusterroles                                   rbac.authorization.k8s.io/v1           false        ClusterRole
priorityclasses                   pc           scheduling.k8s.io/v1                   false        PriorityClass
csidrivers                                     storage.k8s.io/v1                      false        CSIDriver
csinodes                                       storage.k8s.io/v1                      false        CSINode
storageclasses                    sc           storage.k8s.io/v1                      false        StorageClass
volumeattachments                              storage.k8s.io/v1                      false        VolumeAttachment
```

`네임스페이스 내부에 생성할 수 있는 것들`

```bash
» kubectl api-resources --namespaced=true
NAME                        SHORTNAMES   APIVERSION                     NAMESPACED   KIND
bindings                                 v1                             true         Binding
configmaps                  cm           v1                             true         ConfigMap
endpoints                   ep           v1                             true         Endpoints
events                      ev           v1                             true         Event
limitranges                 limits       v1                             true         LimitRange
persistentvolumeclaims      pvc          v1                             true         PersistentVolumeClaim
pods                        po           v1                             true         Pod
podtemplates                             v1                             true         PodTemplate
replicationcontrollers      rc           v1                             true         ReplicationController
resourcequotas              quota        v1                             true         ResourceQuota
secrets                                  v1                             true         Secret
serviceaccounts             sa           v1                             true         ServiceAccount
services                    svc          v1                             true         Service
controllerrevisions                      apps/v1                        true         ControllerRevision
daemonsets                  ds           apps/v1                        true         DaemonSet
deployments                 deploy       apps/v1                        true         Deployment
replicasets                 rs           apps/v1                        true         ReplicaSet
statefulsets                sts          apps/v1                        true         StatefulSet
localsubjectaccessreviews                authorization.k8s.io/v1        true         LocalSubjectAccessReview
horizontalpodautoscalers    hpa          autoscaling/v1                 true         HorizontalPodAutoscaler
cronjobs                    cj           batch/v1beta1                  true         CronJob
jobs                                     batch/v1                       true         Job
leases                                   coordination.k8s.io/v1         true         Lease
endpointslices                           discovery.k8s.io/v1beta1       true         EndpointSlice
events                      ev           events.k8s.io/v1               true         Event
ingresses                   ing          extensions/v1beta1             true         Ingress
ingresses                   ing          networking.k8s.io/v1           true         Ingress
networkpolicies             netpol       networking.k8s.io/v1           true         NetworkPolicy
poddisruptionbudgets        pdb          policy/v1beta1                 true         PodDisruptionBudget
rolebindings                             rbac.authorization.k8s.io/v1   true         RoleBinding
roles                                    rbac.authorization.k8s.io/v1   true         Role
```

### 네임스페이스 내부에 컴포넌트를 만드는 법

이전에 설정파일들로 만들어보았지만, 별도로 네임스페이스를 지정한 적이 없다. 이 경우에는 기본값으로 default 네임스페이스에 생성되어버린다.

```bash
» kubectl apply -f mongo-configmap.yaml --namespace=my-namespace
configmap/mongodb-configmap created
```

또는, `metadata.namespace`에 기재하는 방법 있다.

```yaml
» cat mongo-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: mongodb-configmap
  namespace: my-namespace
data:
  database_url: mongodb-service # 서비스 메타데이터 네임을 그대로 가져온다.%
```

이를 가져오기 위해서는, `-n`을 활용하면 된다.

```bash
» kubectl get configmap -n my-namespace
NAME                DATA   AGE
kube-root-ca.crt    1      19m
mongodb-configmap   1      97s
```

귀찮으니 설정파일 내부에 기재해두자. 문서화에도 도움이되고, 까먹지도 않고 자동으로 편리하게 적용할 수 있다.

### 디폴트 네임스페이스 변경하기

앞서 살펴보았던 것처럼, 기본값은 `default`다. 이 기본값을 바꿔주는 것이 [kubens](https://github.com/ahmetb/kubectx)다.

```bash
» brew install kubectx
==> Downloading https://ghcr.io/v2/homebrew/core/kubectx/manifests/0.9.3
######################################################################## 100.0%
==> Downloading https://ghcr.io/v2/homebrew/core/kubectx/blobs/sha256:30c0b39d23e542bc936994a8c1a47705f0205e42e59cb043adaed21
==> Downloading from https://pkg-containers.githubusercontent.com/ghcr1/blobs/sha256:30c0b39d23e542bc936994a8c1a47705f0205e42
######################################################################## 100.0%
==> Pouring kubectx--0.9.3.all.bottle.tar.gz
==> Caveats
zsh completions have been installed to:
  /usr/local/share/zsh/site-functions
==> Summary
🍺  /usr/local/Cellar/kubectx/0.9.3: 12 files, 37.8KB
```

```bash
» kubens
default
kube-node-lease
kube-public
kube-system
my-namespace
```

활성화 되어있는 네임스페이스가 색이 칠해져서 보일 것이다.

![kubectx](./images/kubectx.png)

```bash
» kubens my-namespace
Context "minikube" modified.
Active namespace is "my-namespace".
```
