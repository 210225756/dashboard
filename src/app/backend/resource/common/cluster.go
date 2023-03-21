// Copyright 2017 The Kubernetes Authors.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package common

import api "k8s.io/api/core/v1"

// ClusterQuery is a query for clusters of a list of objects.
// There's three cases:
// 1. No cluster selected: this means "user clusters" query, i.e., all except kube-system
// 2. Single cluster selected: this allows for optimizations when querying backends
// 3. More than one cluster selected: resources from all clusters are queried and then
//    filtered here.
type ClusterQuery struct {
	clusters []string
}

// ToRequestParam returns K8s API cluster query for list of objects from this clusters.
// This is an optimization to query for single cluster if one was selected and for all
// clusters otherwise.
func (n *ClusterQuery) ToRequestParam() string {
	if len(n.clusters) == 1 {
		return n.clusters[0]
	}
	return api.NamespaceAll
}

// Matches returns true when the given namespace matches this query.
func (n *ClusterQuery) Matches(cluster string) bool {
	if len(n.clusters) == 0 {
		return true
	}

	for _, queryCluster := range n.clusters {
		if cluster == queryCluster {
			return true
		}
	}
	return false
}
