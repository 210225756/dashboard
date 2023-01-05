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
  area    string `json:"area"`
  clusterId string `json:"clusterId"`
}
type ClusterList struct {
  ClusterInfos []ClusterInfo
}

func (p *ClusterList) GetAllCluster() error{
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

func (p *ClusterList) GetClient(cluster string)  {
  //clusterList := p.ClusterInfos
  //for clusterInfo := range clusterList {
  //
  //}
  clientManager := client.NewClientManager("/home/V4-XMZ.config", "https://192.168.142.131:6443")
  versionInfo, err := clientManager.InsecureClient().Discovery().ServerVersion()
  if err != nil {
    handleFatalInitError(err)
  }
  log.Printf("Successful initial request to the apiserver, version: %s", versionInfo.String())
}
