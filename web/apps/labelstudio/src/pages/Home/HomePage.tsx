import type { Page } from "../types/Page";
import { Button } from "@humansignal/shad/components/ui/button";
import { IconFolder, SimpleCard, Spinner } from "@humansignal/ui";
import { IconExternal, IconFolderAdd, IconUserAdd } from "@humansignal/icons";
import { HeidiTips } from "../../components/HeidiTips/HeidiTips";
import { useQuery } from "@tanstack/react-query";
import { useAPI } from "../../providers/ApiProvider";
import { useState } from "react";
import { CreateProject } from "../CreateProject/CreateProject";
import { InviteLink } from "../Organization/PeoplePage/InviteLink";
import { Heading, Sub } from "@humansignal/typography";

const resources = [
  {
    title: "Documentation",
    url: "https://labelstud.io/guide/",
  },
  {
    title: "API Documentation",
    url: "https://api.labelstud.io/api-reference/introduction/getting-started",
  },
  {
    title: "LabelStud.io Blog",
    url: "https://labelstud.io/blog/",
  },
  {
    title: "Slack Community",
    url: "https://slack.labelstud.io",
  },
];

const actions = [
  {
    title: "Create Project",
    icon: IconFolderAdd,
    type: "createProject",
  },
  {
    title: "Invite People",
    icon: IconUserAdd,
    type: "invitePeople",
  },
] as const;

type Action = (typeof actions)[number]["type"];

export const HomePage: Page = () => {
  const api = useAPI();
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [invitationOpen, setInvitationOpen] = useState(false);
  const { data, isFetching, isSuccess, isError } = useQuery({
    queryKey: ["projects"],
    async queryFn() {
      return api.callApi<{ results: APIProject[] }>("projects", {
        params: { page_size: 10 },
      });
    },
  });
  const handleActions = (action: Action) => {
    return () => {
      switch (action) {
        case "createProject":
          setModalIsOpen(true);
          break;
        case "invitePeople":
          setInvitationOpen(true);
          break;
      }
    };
  };

  return (
    <main className="p-8">
      <div className="grid grid-cols-[minmax(0,1fr)_450px] gap-6">
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-1 ">
            <Heading size={1}>Welcome 👋</Heading>
            <Sub>Let's get you started.</Sub>
          </div>
          <div className="flex justify-between 2xl:justify-start gap-4">
            {actions.map((action) => {
              return (
                <Button
                  key={action.title}
                  className="flex-1 2xl:flex-grow-0 text-lsLabelMedium text-lsPrimaryContent [&_svg]:w-6 [&_svg]:h-6"
                  variant="lsOutline"
                  onClick={handleActions(action.type)}
                >
                  <action.icon className="text-lsPrimaryIcon" />
                  {action.title}
                </Button>
              );
            })}
          </div>

          <SimpleCard
            title={
              <>
                Recent Projects{" "}
                <a href="/projects" className="text-lg">
                  View All
                </a>
              </>
            }
          >
            {isFetching ? (
              <div className="h-64 flex justify-center items-center">
                <Spinner />
              </div>
            ) : isError ? (
              <div className="h-64 flex justify-center items-center">can't load projects</div>
            ) : isSuccess && data.results.length === 0 ? (
              <div className="flex flex-col justify-center items-center border border-lsBorderSubtle bg-lsPrimaryEmphasisSubtle rounded-lg h-64">
                <div
                  className={
                    "rounded-full w-12 h-12 flex justify-center items-center bg-lsAccentMangoSubtle text-lsPrimaryIcon"
                  }
                >
                  <IconFolder />
                </div>
                <h2 className="text-2xl">Create your first project</h2>
                <sub className="text-sm text-lsSubtitle">
                  Import your data and set up the labeling interface to start annotating
                </sub>
                <Button className="mt-4" onClick={() => setModalIsOpen(true)}>
                  Create Project
                </Button>
              </div>
            ) : isSuccess && data.results.length > 0 ? (
              <div className="flex flex-col gap-1">
                {data.results.map((project) => {
                  return <ProjectSimpleCard key={project.id} project={project} />;
                })}
              </div>
            ) : null}
          </SimpleCard>
        </section>
        <section className="flex flex-col gap-6">
          <HeidiTips collection="projectSettings" />
          <SimpleCard title="Resources" description="Learn, explore and get help">
            <ul>
              {resources.map((link) => {
                return (
                  <li key={link.title}>
                    <a
                      href={link.url}
                      className="py-2 px-1 flex justify-between items-center text-lsNeutralContent"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {link.title}
                      <IconExternal className="text-lsPrimaryIcon" />
                    </a>
                  </li>
                );
              })}
            </ul>
          </SimpleCard>
        </section>
      </div>
      {modalIsOpen && <CreateProject redirect={false} onClose={() => setModalIsOpen(false)} />}
      <InviteLink opened={invitationOpen} onClosed={() => setInvitationOpen(false)} />
    </main>
  );
};

HomePage.title = "Home";
HomePage.path = "/";
HomePage.exact = true;

function ProjectSimpleCard({
  project,
}: {
  project: APIProject;
}) {
  const finished = project.finished_task_number ?? 0;
  const total = project.task_number ?? 0;
  const progress = (total > 0 ? finished / total : 0) * 100;
  return (
    <div className=" even:bg-lsNeutralSurface rounded-sm overflow-hidden">
      <div className="grid grid-cols-[minmax(0,1fr)_150px] p-4 items-center border-l-2 border-lsNeutralBorderSubtle">
        <div className="flex flex-col gap-1">
          <a href={`/projects/${project.id}`} className="text-lsNeutralContent">
            {project.title}
          </a>
          <div className="text-lsNeutralContentSubtler">
            {finished} / {total}
          </div>
        </div>
        <div className="bg-lsPrimaryEmphasisSubtle rounded-full overflow-hidden w-full h-2 shadow-lsNeutralBorderSubtle shadow-border-1">
          <div className="bg-lsPositiveSurfaceHover h-full min-w-1" style={{ maxWidth: `${progress}%` }}></div>
        </div>
      </div>
    </div>
  );
}
