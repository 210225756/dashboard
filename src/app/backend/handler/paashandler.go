package handler

import (
	"encoding/json"
	"fmt"
	"github.com/kubernetes/dashboard/src/app/backend/client"
  clientapi "github.com/kubernetes/dashboard/src/app/backend/client/api"
  "io/ioutil"
	"log"
	"net/http"
	"os"
)

type PAASHandler interface {
	GetAllCluster()
}

type ClusterInfo struct {
	Area          string `json:"area"`
	ClusterId     string `json:"clusterId"`
	ClusterLBIP   string `json:"clusterLBIP"`
	ClusterLBPort string `json:"clusterLBPort"`
}

func GetAllCluster() ([]ClusterInfo, error) {
	// PAAS_ADMIN_URL is paas admin domain address
	envPaasAdminUrl := os.Getenv("PAAS_ADMIN_URL")
  //envPaasAdminUrl := "192.168.66.1:8888"
  var p []ClusterInfo
	if envPaasAdminUrl == "" {
		return p, fmt.Errorf("PAAS_ADMIN_URL should not be empty")
	}
	url := fmt.Sprintf("http://%s/icbc/paas/api/cluster/getAllCluster", envPaasAdminUrl)
	resp, err := http.Get(url)
	if err != nil {
		return p, err
	}
	defer resp.Body.Close()
	body, err := ioutil.ReadAll(resp.Body)
	fmt.Println(string(body))
	if resp.StatusCode == 200 {
		fmt.Println("ok")
		json.Unmarshal([]byte(body), &p)
	}
	return p, fmt.Errorf("ERROR when get all cluster from paas plat, the status code is %s", resp.StatusCode)
}
// GetClient change client-go
func GetClient(clusterList []ClusterInfo, cluster string) (clientapi.ClientManager, error) {
	kubeConfigDir := os.Getenv("KUBE_CONFIG_DIR")
	if kubeConfigDir == "" {
		return nil, fmt.Errorf("KUBE_CONFIG_DIR should not be empty")
	}
	kubeConfigPath := fmt.Sprintf("%s/%s", kubeConfigDir, cluster)
	exist, err := KubeConfigExists(kubeConfigPath)
	if !exist {
		return nil, err
	}

	var apiServer string
	for _, clusterInfo := range clusterList {
		if clusterInfo.ClusterId == cluster {
			if clusterInfo.ClusterLBPort == "8080" {
				apiServer = fmt.Sprintf("http://%s:%s", clusterInfo.ClusterLBIP, clusterInfo.ClusterLBPort)
			} else {
				apiServer = fmt.Sprintf("https://%s:%s", clusterInfo.ClusterLBIP, clusterInfo.ClusterLBPort)
			}
		}
	}
	log.Printf("Cluster %s of apiServer IP is %s ", cluster, apiServer)
	clientManager := client.NewClientManager(kubeConfigPath, apiServer)
	versionInfo, err := clientManager.InsecureClient().Discovery().ServerVersion()
	if err != nil {
		handleFatalInitError(err)
	}
	log.Printf("Successful initial request to the apiserver, version: %s", versionInfo.String())
	return clientManager, nil
}

// KubeConfigExists check kubeconfig isExists
func KubeConfigExists(path string) (bool, error) {
	_, err := os.Stat(path)
	if err == nil {
		return true, nil
	}
	if os.IsNotExist(err) {
		return false, nil
	}
	return false, err
}
