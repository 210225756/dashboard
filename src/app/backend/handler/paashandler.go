package handler

import (
	"encoding/json"
	"fmt"
	"github.com/kubernetes/dashboard/src/app/backend/client"
	"io/ioutil"
	"log"
	"net/http"
	"os"
)

type PAASHandler interface {
	GetAllCluster()
}

type ClusterInfo struct {
	area          string `json:"area"`
	clusterId     string `json:"clusterId"`
	clusterLBIP   string `json:"clusterLBIP"`
	clusterLBPort string `json:"clusterLBPort"`
}
type ClusterList struct {
	ClusterInfos []*ClusterInfo
}

func (p *ClusterList) GetAllCluster() error {
	// PAAS_ADMIN_URL is paas admin domain address
	envPaasAdminUrl := os.Getenv("PAAS_ADMIN_URL")
	if envPaasAdminUrl == "" {
		return fmt.Errorf("PAAS_ADMIN_URL should not be empty")
	}
	url := fmt.Sprintf("http://%s/icbc/paas/api/cluster/getAllCluster", envPaasAdminUrl)
	resp, err := http.Get(url)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	body, err := ioutil.ReadAll(resp.Body)
	fmt.Println(string(body))
	if resp.StatusCode == 200 {
		fmt.Println("ok")
		json.Unmarshal([]byte(body), &p)
	}
	return fmt.Errorf("ERROR when get all cluster from paas plat, the status code is %s", resp.StatusCode)
}

func (p *ClusterList) GetClient(cluster string) error {
	kubeConfigDir := os.Getenv("KUBE_CONFIG_DIR")
	if kubeConfigDir == "" {
		return fmt.Errorf("KUBE_CONFIG_DIR should not be empty")
	}
	kubeConfigPath := fmt.Sprintf("%s/%s", kubeConfigDir, cluster)
	exist, err := KubeConfigExists(kubeConfigPath)
	if !exist {
		return err
	}

	var apiServer string
	for _, clusterInfo := range p.ClusterInfos {
		if clusterInfo.clusterId == cluster {
			if clusterInfo.clusterLBPort == "8080" {
				apiServer = fmt.Sprintf("http://%s:%s", clusterInfo.clusterLBIP, clusterInfo.clusterLBPort)
			} else {
				apiServer = fmt.Sprintf("https://%s:%s", clusterInfo.clusterLBIP, clusterInfo.clusterLBPort)
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
	return nil
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
