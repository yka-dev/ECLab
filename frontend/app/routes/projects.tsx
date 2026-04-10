import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card, CardContent } from "~/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "~/components/ui/dialog";
import { MoreVertical, Plus, Search, LogOut } from "lucide-react";
import { getCookie } from "~/lib/utils";
import { redirect, useNavigate } from "react-router";
import { toast } from "sonner";

type Project = {
  id: string;
  name: string;
  thumbnail: string;
};

export async function loader({ request }: { request: Request }) {
  const cookieHeader = request.headers.get("Cookie");
  const session = getCookie(cookieHeader, "eclab_session_id");
  if (session === null) {
    return redirect("/projects/guest");
  }

  const resp = await fetch(`${import.meta.env.VITE_API_ENDPOINT}/projects`, {
    method: "GET",
    headers: request.headers
  }) 

  if(!resp.ok) {
    return redirect("/projects/guest")
  }

  const projects = await resp.json();


  return projects ?? [];
}
export default function Projects({loaderData}) {
  const [projects, setProjects] = useState<Project[]>(loaderData);
  const [search, setSearch] = useState("");
  const [openCreate, setOpenCreate] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [loading, setLoading] = useState(false)


  const navigate = useNavigate();

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );

  function handleRename(id: string) {
    const newName = prompt("Nouveau nom du projet");
    if (!newName) return;

    fetch(`${import.meta.env.VITE_API_ENDPOINT}/projects/${id}`, {
      method :"PATCH",
      credentials: "include",
      headers: {
        "Content-Type" : "application/json"
      },
      body: JSON.stringify({ name: newName })
    })

    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, name: newName } : p)),
    );
  }

  function handleDelete(id: string) {
    fetch(`${import.meta.env.VITE_API_ENDPOINT}/projects/${id}`, {
      method :"DELETE",
      credentials: "include"
    })
    setProjects((prev) => prev.filter((p) => p.id !== id));
  }

  function handleCreateProject() {
    const name = newProjectName.trim();
    if (!name) return;


    setLoading(true)
    fetch(`${import.meta.env.VITE_API_ENDPOINT}/project`, {
      method: "POST",
      credentials: "include",
      headers : {
        "Content-Type" : "application/json"
      },
      body: JSON.stringify({name})
    }).then(response => {
      if (response.ok) {
        return response.json()
      } else {
        toast.error("Echec lors de la création du projet");
      }
    })
    .then(project => {
      setProjects((prev) => [...prev, project]);
    })
    .finally(() => {
      setLoading(false)
      setOpenCreate(false)
      setNewProjectName("");
    })


  }

  return (
    <div className="min-h-screen bg-muted/30 p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Barre supérieure */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Projets</h1>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => {
                fetch(`${import.meta.env.VITE_API_ENDPOINT}/auth`, {
                  method: "DELETE",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  credentials: "include",
                }).then((response) => {
                  navigate("/login");
                });
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Se déconnecter
            </Button>

            <Button onClick={() => setOpenCreate(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nouveau projet
            </Button>
          </div>
        </div>

        {/* Recherche */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un projet..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Vue vide */}
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground">
            <p className="text-lg font-medium">
              Vous n’avez encore aucun projet
            </p>
            <p className="text-sm">
              Créez votre premier projet pour commencer.
            </p>

            <Button className="mt-6" onClick={() => setOpenCreate(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Créer un projet
            </Button>
          </div>
        ) : (
          <>
            {/* Grille de projets */}
            <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {filteredProjects.map((project) => (
                <Card key={project.id} className="cursor-pointer" onClick={() => navigate(`/projects/${project.id}`)}>
                  <CardContent className="p-0">
                    {/* Thumbnail */}
                    <div className="aspect-video w-full overflow-hidden rounded-t-lg">
                      <img
                        src={project.thumbnail}
                        alt={project.name}
                        className="h-full w-full object-cover"
                      />
                    </div>

                    {/* Nom + menu */}
                    <div className="flex items-center justify-between p-4">
                      <span className="truncate font-medium" >
                        {project.name}
                      </span>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleRename(project.id)}
                          >
                            Renommer
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            className="text-red-500"
                            onClick={() => handleDelete(project.id)}
                          >
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredProjects.length === 0 && (
              <div className="py-16 text-center text-muted-foreground">
                Aucun projet ne correspond à votre recherche.
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal création projet */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer un projet</DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            <Input
              placeholder="Nom du projet"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCreate(false)}>
              Annuler
            </Button>

            <Button onClick={handleCreateProject} disabled={loading}>Créer le projet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
