{}:
let
  # Pin the deployment package-set to a specific version of nixpkgs
  pkgs = import
    (builtins.fetchTarball {
      url = "https://github.com/NixOS/nixpkgs/archive/8966c43feba2c701ed624302b6a935f97bcbdf88.tar.gz";
      sha256 = "1j7g15q2y21bmj709005fqmsb2sriz2jrk1shhnpsj8qys27qws8";
    })
    { };
  nodejs = pkgs.nodejs-18_x;
in
pkgs.stdenv.mkDerivation {
  name = "blockfrost-js-examples";
  buildInputs = [
    (pkgs.yarn.override { inherit nodejs; })
  ];
  shellHook = ''
    export PATH="$PATH:$(pwd)/node_modules/.bin"
    yarn
  '';
}

